"""
MyDevice Python SDK v1.0
========================
A simple library to connect your device to the MyDevice IoT Platform.

Installation:
    pip install paho-mqtt
    Place this file (mydevice.py) next to your script, then:
        from mydevice import MyDevice

Usage:
    device = MyDevice("DEV-001-ABCD", "your_secret_key")

    # Register capabilities
    cap = device.add_capability("motor_control", "Motor Control", "Control actuators")
    cap.add_action("SET_FAN_SPEED", "Set Fan Speed", "0=off, 3=high",
                   speed={"type": "number", "min": 0, "max": 3, "step": 1})

    # Handle commands
    @device.on_command("SET_FAN_SPEED")
    def handle_fan(params):
        print(f"Fan speed set to {params['speed']}")
        return True  # Return True=COMPLETED, False=FAILED

    # Connect and start
    device.connect()

    # Send telemetry
    while True:
        device.send("sensor_1", temperature=25.4, humidity=60)
        time.sleep(5)
"""

import paho.mqtt.client as mqtt
import json
import time
import threading


class Capability:
    """Represents a capability group with actions."""

    def __init__(self, name, label, description="", state_path=""):
        self.name = name
        self.label = label
        self.description = description
        self.state_path = state_path
        self.actions = []

    def add_action(self, name, label, description="", **parameters):
        """
        Add an action to this capability.

        Parameters are passed as keyword arguments:
            cap.add_action("SET_FAN_SPEED", "Set Fan Speed", "Set speed 0-3",
                           speed={"type": "number", "min": 0, "max": 3, "step": 1, "required": True})
        """
        formatted_params = {}
        for pname, pconfig in parameters.items():
            if isinstance(pconfig, dict):
                formatted_params[pname] = pconfig
            else:
                formatted_params[pname] = {"type": type(pconfig).__name__, "required": True}

        self.actions.append({
            "name": name,
            "label": label,
            "description": description,
            "parameters": formatted_params
        })
        return self

    def to_dict(self):
        d = {
            "name": self.name,
            "label": self.label,
            "description": self.description,
        }
        if self.actions:
            d["actions"] = self.actions
        if self.state_path:
            d["state_mapping"] = {"path": self.state_path, "unit": "metrics"}
        return d


class MyDevice:
    """
    MyDevice IoT SDK — connect, send data, register capabilities, and handle commands.

    Args:
        device_id:  Your device ID (e.g. "DEV-001-ABCD")
        secret_key: Your device secret key
        broker:     MQTT broker host (default: "mydevice.in")
        port:       MQTT broker port (default: 1883)
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

        # Internal state
        self._capabilities = []
        self._handlers = {}
        self._client = None
        self._connected = False

    # ── Capabilities ─────────────────────────────────────────────────

    def add_capability(self, name, label, description="", state_path=""):
        """
        Register a capability group.

        Args:
            name:        Snake_case ID, e.g. "motor_control"
            label:       Human label, e.g. "Motor Control"
            description: Short description
            state_path:  Telemetry path for live state, e.g. "motor_status.fan_speed"

        Returns:
            Capability object — call .add_action() on it to add actions.

        Example:
            cap = device.add_capability("motor_control", "Motor Control")
            cap.add_action("SET_FAN_SPEED", "Set Fan Speed", speed={"type": "number", "min": 0, "max": 3})
        """
        cap = Capability(name, label, description, state_path)
        self._capabilities.append(cap)
        return cap

    def publish_capabilities(self):
        """Publish all registered capabilities to the platform. Called automatically on connect."""
        if not self._capabilities:
            return
        payload = [c.to_dict() for c in self._capabilities]
        self._client.publish(self._t_caps, json.dumps(payload), retain=True)

    # ── Commands ─────────────────────────────────────────────────────

    def on_command(self, command_type):
        """
        Decorator to register a command handler.

        The handler receives a dict of parameters and must return True (COMPLETED) or False (FAILED).

        Example:
            @device.on_command("SET_FAN_SPEED")
            def handle_fan(params):
                set_fan(params["speed"])
                return True
        """
        def decorator(fn):
            self._handlers[command_type] = fn
            return fn
        return decorator

    def handle(self, command_type, handler):
        """
        Register a command handler (non-decorator version).

        Args:
            command_type: e.g. "SET_FAN_SPEED"
            handler:      function(params) -> bool
        """
        self._handlers[command_type] = handler

    # ── Telemetry ────────────────────────────────────────────────────

    def send(self, source="sensor_1", **fields):
        """
        Send telemetry data to the platform.

        Args:
            source: Logical group name, e.g. "sensor_1", "motor_status"
            **fields: Key=value pairs of telemetry data

        Example:
            device.send("sensor_1", temperature=25.4, humidity=60, pressure=1013.2)
            device.send("motor_status", fan_speed=2, pump_active=True)
        """
        payload = {
            "device_id": self.device_id,
            "source": source,
            "data": fields
        }
        self._client.publish(self._t_data, json.dumps(payload, default=str))

    def send_raw(self, data, source="sensor_1"):
        """
        Send a pre-built data dict.

        Args:
            data:   Dict of field_name: value
            source: Logical group name
        """
        payload = {
            "device_id": self.device_id,
            "source": source,
            "data": data
        }
        self._client.publish(self._t_data, json.dumps(payload, default=str))

    # ── Connection ───────────────────────────────────────────────────

    def connect(self, blocking=True):
        """
        Connect to the MyDevice platform.

        Args:
            blocking: If True (default), starts the MQTT loop in the current thread.
                      If False, starts a background thread — useful for async or GUI apps.
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

        self._client.connect(self.broker, self.port, keepalive=60)

        if blocking:
            self._client.loop_start()
        else:
            t = threading.Thread(target=self._client.loop_forever, daemon=True)
            t.start()

    def disconnect(self):
        """Publish offline status and disconnect gracefully."""
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
        """Returns True if currently connected to the broker."""
        return self._connected

    # ── Status ───────────────────────────────────────────────────────

    def set_status(self, status):
        """Publish an explicit status ("online" or "offline")."""
        self._client.publish(
            self._t_status,
            json.dumps({"device_id": self.device_id, "status": status})
        )

    # ── Private ──────────────────────────────────────────────────────

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self._connected = True
            client.subscribe(self._t_cmd)
            self.set_status("online")
            self.publish_capabilities()
        else:
            print(f"[MyDevice] Connection refused (rc={rc})")

    def _on_disconnect(self, client, userdata, rc):
        self._connected = False

    def _on_message(self, client, userdata, msg):
        try:
            envelope = json.loads(msg.payload.decode("utf-8"))
            cmd_type = envelope.get("command_type", envelope.get("type", envelope.get("command", "UNKNOWN")))
            params = envelope.get("parameters", envelope.get("payload", {}))
            cmd_id = envelope.get("command_id", "n/a")
            corr_id = envelope.get("correlation_id", "n/a")

            handler = self._handlers.get(cmd_type)
            if handler:
                try:
                    result = handler(params)
                    status = "COMPLETED" if result else "FAILED"
                except Exception as e:
                    status = "FAILED"
                    print(f"[MyDevice] Command handler error: {e}")
            else:
                status = "REJECTED"

            if cmd_id != "n/a":
                ack = {
                    "command_id": cmd_id,
                    "correlation_id": corr_id,
                    "status": status
                }
                client.publish(self._t_cmd_ack, json.dumps(ack))

        except Exception as e:
            print(f"[MyDevice] Message processing error: {e}")
