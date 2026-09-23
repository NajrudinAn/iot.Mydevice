"""
MyDevice Python SDK v2.0 (Blueprint API)
========================================
A comprehensive library to connect your device to the MyDevice IoT Platform.

This SDK uses a declarative Blueprint API. You define what your device has
(Properties) and what it can do (Actions). The SDK automatically handles
MQTT connectivity, capability mapping, state syncing, and command routing.

Installation:
    pip install paho-mqtt
    Place this file (mydevice.py) next to your script, then:
        from mydevice import MyDevice

Usage:
    from mydevice import MyDevice
    import time

    device = MyDevice("DEV-001", "secret")
    
    # 1. Read-only Telemetry
    device.add_reading("temperature", "Temperature", "number", unit="°C")
    
    # 2. Controllable Property (Switch)
    def handle_light(is_on):
        print(f"Light is now {is_on}")
        
    device.add_switch("light", "Main Light", on_change=handle_light)
                        
    # 3. Stateless Action
    def reboot(params):
        print("Rebooting...")
        
    device.add_action("reboot", "Reboot Device", on_execute=reboot)

    device.connect()
    
    while True:
        device.send("temperature", read_sensor())
        time.sleep(5)
"""

import paho.mqtt.client as mqtt
import json
import time
import threading
from typing import Any, Callable, Dict, List, Optional, Union


class MyDevice:
    """
    MyDevice IoT SDK Client.
    Handles connection, telemetry state caching, blueprint publishing, and command routing automatically.
    """

    def __init__(self, device_id: str, secret_key: str, broker: str = "mydevice.in", port: int = 1883):
        """
        Initialize a new MyDevice client.
        
        Args:
            device_id: Your unique device ID (e.g. 'DEV-001').
            secret_key: The secret key for MQTT authentication.
            broker: MQTT broker host address.
            port: MQTT broker port.
        """
        self.device_id = device_id
        self.secret_key = secret_key
        self.broker = broker
        self.port = port

        # Internal Topics mapping
        self._t_data = f"devices/{device_id}/data"
        self._t_status = f"devices/{device_id}/status"
        self._t_cmd = f"devices/{device_id}/command"
        self._t_cmd_ack = f"devices/{device_id}/command/ack"
        self._t_caps = f"devices/{device_id}/capabilities"

        # State and Blueprints
        self._properties: Dict[str, dict] = {}
        self._actions: Dict[str, dict] = {}
        self._state_cache: Dict[str, Any] = {}
        
        # Internals
        self._client: Optional[mqtt.Client] = None
        self._connected: bool = False
        self._reconnect_delay = 1
        self._lock = threading.Lock()

    # ── Blueprint API ────────────────────────────────────────────────

    def add_property(self, name: str, label: str, data_type: str = "number", unit: str = "", 
                     min_val: Optional[float] = None, max_val: Optional[float] = None, step: Optional[float] = None, 
                     options: Optional[List[str]] = None, writable: bool = False, 
                     on_change: Optional[Callable[[Any], None]] = None):
        """
        Defines a generic property on the device (telemetry, state, or controllable feature).
        
        If writable=True, it automatically creates a corresponding 'SET_{NAME}' action 
        and routes incoming commands to `on_change(new_value)`.
        
        Args:
            name: Unique identifier for the property (e.g. 'fan_speed').
            label: Human-readable name for UI generation.
            data_type: 'number', 'boolean', or 'string'.
            unit: Unit of measurement (e.g. '°C', '%').
            min_val: Minimum value (for numbers).
            max_val: Maximum value (for numbers).
            step: Step increment (for numbers).
            options: List of valid string options for enum types (e.g. ["AUTO", "COOL"]).
            writable: If True, the platform can send SET commands to change this property.
            on_change: Callback function executed when the platform updates this property.
        """
        prop = {
            "name": name,
            "label": label,
            "type": data_type,
            "unit": unit,
            "writable": writable,
            "on_change": on_change
        }
        
        if data_type == "number":
            if min_val is not None: prop["min"] = min_val
            if max_val is not None: prop["max"] = max_val
            if step is not None: prop["step"] = step
        elif options:
            prop["options"] = options
            
        self._properties[name] = prop

    def add_reading(self, name: str, label: str, data_type: str = "number", unit: str = ""):
        """
        Helper to define read-only data (e.g. sensor telemetry, state strings).
        
        Args:
            name: Unique identifier (e.g. 'temperature').
            label: Human-readable name (e.g. 'Room Temp').
            data_type: 'number', 'boolean', 'string'.
            unit: Unit of measurement.
        """
        self.add_property(name, label, data_type=data_type, unit=unit, writable=False)

    def add_switch(self, name: str, label: str, on_change: Callable[[bool], None]):
        """
        Helper to define a controllable on/off switch.
        
        Args:
            name: Unique identifier (e.g. 'main_light').
            label: Human-readable name.
            on_change: Callback triggered when toggled from the platform.
        """
        self.add_property(name, label, data_type="boolean", writable=True, on_change=on_change)

    def add_slider(self, name: str, label: str, min_val: float, max_val: float, 
                   on_change: Callable[[float], None], step: Optional[float] = None):
        """
        Helper to define a controllable numeric slider.
        
        Args:
            name: Unique identifier (e.g. 'fan_speed').
            label: Human-readable name.
            min_val: Minimum value.
            max_val: Maximum value.
            on_change: Callback triggered when adjusted from the platform.
            step: Optional step increment.
        """
        self.add_property(name, label, data_type="number", min_val=min_val, max_val=max_val, 
                          step=step, writable=True, on_change=on_change)

    def add_action(self, name: str, label: str, description: str = "", 
                   parameters: Optional[Dict[str, Any]] = None, 
                   on_execute: Optional[Callable[[Dict[str, Any]], None]] = None):
        """
        Defines a stateless action/command the device can execute (e.g. Reboot, Calibrate).
        
        Args:
            name: Unique identifier (e.g. 'reboot').
            label: Human-readable name.
            description: Description of what the action does.
            parameters: Dictionary mapping parameter names to their configs.
            on_execute: Callback triggered when action is executed, receives parameter dict.
        """
        self._actions[name] = {
            "name": name,
            "label": label,
            "description": description,
            "parameters": parameters or {},
            "on_execute": on_execute
        }

    def update_property(self, name: str, value: Any, force_send: bool = False):
        """
        Updates the local state of a property and automatically publishes it to the platform.
        
        Args:
            name: The property identifier to update.
            value: The new value.
            force_send: If True, publishes to MQTT even if the local value hasn't changed.
        """
        if name not in self._properties:
            print(f"[MyDevice] Warning: Property '{name}' not defined.")
            return

        with self._lock:
            # Only send if changed, or if forced
            if not force_send and self._state_cache.get(name) == value:
                return
            self._state_cache[name] = value

        if self._connected:
            self._send_telemetry({name: value})

    def update_properties(self, updates_dict: Dict[str, Any]):
        """
        Updates multiple properties at once, pushing them to the platform in a single optimized telemetry payload.
        
        Args:
            updates_dict: Key-value map of properties to update (e.g. {'temperature': 25.0, 'humidity': 60}).
        """
        changed = {}
        with self._lock:
            for name, value in updates_dict.items():
                if name in self._properties:
                    if self._state_cache.get(name) != value:
                        self._state_cache[name] = value
                        changed[name] = value
                else:
                    print(f"[MyDevice] Warning: Property '{name}' not defined.")
                    
        if changed and self._connected:
            self._send_telemetry(changed)

    def send(self, name: str, value: Any, force_send: bool = False):
        """
        Alias for `update_property` for shorter syntax.
        
        Args:
            name: The property identifier.
            value: The new value.
            force_send: Force publish to MQTT.
        """
        self.update_property(name, value, force_send)

    # ── Platform Syncing ─────────────────────────────────────────────

    def _generate_capabilities_schema(self) -> List[dict]:
        """Convert the Blueprint (Properties & Actions) into the platform JSON schema."""
        capabilities = []
        
        # 1. Map Properties to a single 'state' capability group
        if self._properties:
            state_cap = {
                "name": "device_state",
                "label": "Device State",
                "description": "Device properties and sensors",
                "actions": []
            }
            
            for p_name, p in self._properties.items():
                if p["writable"]:
                    action_def = {
                        "name": f"SET_{p_name.upper()}",
                        "label": f"Set {p['label']}",
                        "description": f"Update {p_name}",
                        "parameters": {
                            p_name: {
                                "type": p["type"],
                                "required": True
                            }
                        }
                    }
                    if "min" in p: action_def["parameters"][p_name]["min"] = p["min"]
                    if "max" in p: action_def["parameters"][p_name]["max"] = p["max"]
                    if "step" in p: action_def["parameters"][p_name]["step"] = p["step"]
                    if "options" in p: action_def["parameters"][p_name]["options"] = p["options"]
                    
                    state_cap["actions"].append(action_def)
            
            capabilities.append(state_cap)
            
        # 2. Map Actions to a 'system_actions' capability group
        if self._actions:
            action_cap = {
                "name": "system_actions",
                "label": "System Actions",
                "description": "Stateless device commands",
                "actions": []
            }
            for a_name, a in self._actions.items():
                formatted_params = {}
                for pname, pconfig in a["parameters"].items():
                    if isinstance(pconfig, dict):
                        formatted_params[pname] = pconfig
                    else:
                        formatted_params[pname] = {"type": type(pconfig).__name__, "required": True}
                        
                action_cap["actions"].append({
                    "name": a_name,
                    "label": a["label"],
                    "description": a["description"],
                    "parameters": formatted_params
                })
            
            capabilities.append(action_cap)
            
        return capabilities

    def _publish_schema(self):
        """Internal method to publish blueprint capabilities as a retained MQTT message."""
        schema = self._generate_capabilities_schema()
        if schema:
            self._client.publish(self._t_caps, json.dumps(schema), retain=True)

    def _send_telemetry(self, data_dict: dict):
        """Internal method to publish the standard JSON telemetry payload."""
        payload = {
            "device_id": self.device_id,
            "source": "state", # Default source for property sync
            "data": data_dict
        }
        self._client.publish(self._t_data, json.dumps(payload, default=str))

    # ── Connection & Networking ──────────────────────────────────────

    def connect(self, blocking: bool = False):
        """
        Connects to the MyDevice MQTT broker, syncs blueprints, and starts listening for commands.
        Automatically handles reconnects.
        
        Args:
            blocking: If True, blocks the main thread (useful for simple scripts).
                      If False, runs the MQTT loop in a background thread.
        """
        self._client = mqtt.Client(client_id=self.device_id)
        self._client.username_pw_set(self.device_id, self.secret_key)
        self._client.will_set(
            self._t_status,
            json.dumps({"device_id": self.device_id, "status": "offline"}),
            retain=False
        )
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

        try:
            self._client.connect(self.broker, self.port, keepalive=5)
        except Exception as e:
            print(f"[MyDevice] Initial connection failed: {e}. Will retry in background.")

        if blocking:
            self._client.loop_forever(retry_first_connection=True)
        else:
            self._client.loop_start()

    def disconnect(self):
        """Disconnects from the MyDevice platform gracefully."""
        if self._client:
            self._client.publish(
                self._t_status,
                json.dumps({"device_id": self.device_id, "status": "offline"})
            )
            time.sleep(0.3)
            self._client.loop_stop()
            self._client.disconnect()
            self._connected = False

    @property
    def is_connected(self) -> bool:
        """Returns True if currently connected to the broker."""
        return self._connected

    def set_status(self, status: str):
        """
        Manually updates the device's online/offline status on the platform.
        
        Args:
            status: 'online', 'offline', 'error', etc.
        """
        self._client.publish(
            self._t_status,
            json.dumps({"device_id": self.device_id, "status": status})
        )

    # ── Handlers ─────────────────────────────────────────────────────

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"[MyDevice] Connected successfully as {self.device_id}")
            self._connected = True
            client.subscribe(self._t_cmd)
            self.set_status("online")
            self._publish_schema()
            
            # Publish initial state cache
            with self._lock:
                if self._state_cache:
                    self._send_telemetry(self._state_cache)
        else:
            print(f"[MyDevice] Connection refused (rc={rc})")

    def _on_disconnect(self, client, userdata, rc):
        self._connected = False
        if rc != 0:
            print("[MyDevice] Unexpected disconnection. Auto-reconnecting...")

    def _on_message(self, client, userdata, msg):
        try:
            envelope = json.loads(msg.payload.decode("utf-8"))
            cmd_type = envelope.get("command_type", envelope.get("type", envelope.get("command", "UNKNOWN")))
            params = envelope.get("parameters", envelope.get("payload", {}))
            cmd_id = envelope.get("command_id", "n/a")
            corr_id = envelope.get("correlation_id", "n/a")

            status = "REJECTED"

            # 1. Check if it's an auto-generated Property SET command (e.g. "SET_FAN_SPEED")
            if cmd_type.startswith("SET_"):
                prop_name = cmd_type[4:].lower()
                
                target_prop = None
                for p_name in self._properties:
                    if p_name.lower() == prop_name:
                        target_prop = p_name
                        break
                        
                if target_prop and self._properties[target_prop]["writable"]:
                    if target_prop in params:
                        val = params[target_prop]
                        try:
                            cb = self._properties[target_prop].get("on_change")
                            if cb: cb(val)
                            
                            # Automatically update state and push telemetry
                            self.update_property(target_prop, val, force_send=True)
                            status = "COMPLETED"
                        except Exception as e:
                            print(f"[MyDevice] Property handler error: {e}")
                            status = "FAILED"
                    else:
                        print(f"[MyDevice] Missing parameter '{target_prop}' in command")
                        status = "FAILED"

            # 2. Check if it's a Stateless Action
            elif cmd_type in self._actions:
                try:
                    cb = self._actions[cmd_type].get("on_execute")
                    if cb: cb(params)
                    status = "COMPLETED"
                except Exception as e:
                    print(f"[MyDevice] Action handler error: {e}")
                    status = "FAILED"
            
            else:
                print(f"[MyDevice] Unknown command: {cmd_type}")

            # Send ACK
            if cmd_id != "n/a":
                ack = {
                    "command_id": cmd_id,
                    "correlation_id": corr_id,
                    "status": status
                }
                client.publish(self._t_cmd_ack, json.dumps(ack))

        except Exception as e:
            print(f"[MyDevice] Message processing error: {e}")
