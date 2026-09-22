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
    device = MyDevice("DEV-001", "secret")
    
    # 1. Read-only Telemetry
    device.add_property("temperature", "Temperature", "number", unit="°C", writable=False)
    
    # 2. Controllable Property (Switch)
    device.add_property("light", "Main Light", "boolean", writable=True, 
                        on_change=lambda val: print(f"Light is now {val}"))
                        
    # 3. Stateless Action
    device.add_action("reboot", "Reboot Device", on_execute=lambda params: reboot())

    device.connect()
    
    while True:
        device.update_property("temperature", read_sensor())
        time.sleep(5)
"""

import paho.mqtt.client as mqtt
import json
import time
import threading


class MyDevice:
    """
    MyDevice IoT SDK — connect, define properties/actions, and auto-sync state.
    """

    def __init__(self, device_id, secret_key, broker="mydevice.in", port=1883):
        self.device_id = device_id
        self.secret_key = secret_key
        self.broker = broker
        self.port = port

        # Topics
        self._t_data = f"devices/{device_id}/data"
        self._t_status = f"devices/{device_id}/status"
        self._t_cmd = f"devices/{device_id}/command"
        self._t_cmd_ack = f"devices/{device_id}/command/ack"
        self._t_caps = f"devices/{device_id}/capabilities"

        # State and Blueprints
        self._properties = {}
        self._actions = {}
        self._state_cache = {}
        
        # Internals
        self._client = None
        self._connected = False
        self._reconnect_delay = 1
        self._lock = threading.Lock()

    # ── Blueprint API ────────────────────────────────────────────────

    def add_property(self, name, label, data_type="number", unit="", 
                     min_val=None, max_val=None, step=None, options=None, 
                     writable=False, on_change=None):
        """
        Define a property (telemetry state).
        If writable=True, it automatically creates a corresponding 'SET_{NAME}' action 
        and routes incoming commands to `on_change(new_value)`.
        
        Args:
            name: ID of the property (e.g. "fan_speed")
            label: Human-readable name
            data_type: "number", "boolean", "string"
            unit: e.g. "°C", "%"
            min_val, max_val, step: For numbers
            options: List of strings for enum types (e.g. ["AUTO", "COOL", "HEAT"])
            writable: Can this be controlled from the platform?
            on_change: Callback function(value) triggered when changed from platform.
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

    def add_reading(self, name, label, data_type="number", unit=""):
        """Define any read-only data (e.g. sensor telemetry, status strings)."""
        self.add_property(name, label, data_type=data_type, unit=unit, writable=False)

    def add_switch(self, name, label, on_change):
        """Define a controllable on/off switch."""
        self.add_property(name, label, data_type="boolean", writable=True, on_change=on_change)

    def add_slider(self, name, label, min_val, max_val, on_change, step=None):
        """Define a controllable number slider."""
        self.add_property(name, label, data_type="number", min_val=min_val, max_val=max_val, step=step, writable=True, on_change=on_change)

    def add_action(self, name, label, description="", parameters=None, on_execute=None):
        """
        Define a stateless action (e.g., Reboot, Calibrate).
        
        Args:
            name: ID of the action (e.g. "reboot")
            label: Human-readable name
            description: Short description
            parameters: Dict of parameter configurations.
            on_execute: Callback function(params_dict) triggered when executed.
        """
        self._actions[name] = {
            "name": name,
            "label": label,
            "description": description,
            "parameters": parameters or {},
            "on_execute": on_execute
        }

    def update_property(self, name, value, force_send=False):
        """
        Update the local state of a property and automatically publish to the platform.
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

    def update_properties(self, updates_dict):
        """
        Update multiple properties at once and send a single telemetry payload.
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

    def send(self, name, value, force_send=False):
        """Alias for update_property for simpler syntax."""
        self.update_property(name, value, force_send)

    # ── Platform Syncing ─────────────────────────────────────────────

    def _generate_capabilities_schema(self):
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
                # If writable, auto-generate a SET action
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
        schema = self._generate_capabilities_schema()
        if schema:
            self._client.publish(self._t_caps, json.dumps(schema), retain=True)

    def _send_telemetry(self, data_dict):
        """Internal method to send data."""
        payload = {
            "device_id": self.device_id,
            "source": "state", # Default source for property sync
            "data": data_dict
        }
        self._client.publish(self._t_data, json.dumps(payload, default=str))

    # ── Connection & Networking ──────────────────────────────────────

    def connect(self, blocking=False):
        """
        Connect to the MyDevice platform and sync blueprints.
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
            self._client.connect(self.broker, self.port, keepalive=60)
        except Exception as e:
            print(f"[MyDevice] Initial connection failed: {e}. Will retry in background.")

        if blocking:
            self._client.loop_forever(retry_first_connection=True)
        else:
            self._client.loop_start()

    def disconnect(self):
        """Graceful disconnect."""
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
    def is_connected(self):
        return self._connected

    def set_status(self, status):
        """Explicitly set status."""
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
                
                # We need to find the actual property name case-insensitively, 
                # or just assume the property name is strictly matching the substring.
                # A robust check:
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
