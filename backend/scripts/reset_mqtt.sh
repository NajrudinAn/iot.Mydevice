#!/bin/bash
# ---------------------------------------------------------
# Ultimate Mosquitto Reset Script
# Completely wipes the Mosquitto configuration and securely
# rebuilds it using the credentials in backend/.env
# ---------------------------------------------------------

echo "============================================"
echo "    Resetting Mosquitto Configuration"
echo "============================================"

# Navigate to backend folder to ensure paths resolve correctly
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "❌ Error: Could not find .env file in $(pwd)!"
    exit 1
fi

echo "✅ Found .env file, loading credentials..."
set -a
source .env
set +a

MQTT_USER=${MQTT_USERNAME:-backend_admin}
MQTT_PASS=${MQTT_PASSWORD:-super_secret_backend}

# Absolute paths for Oracle Linux native install
PWD_FILE="/home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.passwd"
ACL_FILE="/home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.acl"

echo "✅ Wiping old password file..."
# -c creates a brand new file, wiping all old entries!
sudo mosquitto_passwd -c -b $PWD_FILE $MQTT_USER $MQTT_PASS

echo "✅ Wiping old Access Control List (ACL)..."
sudo bash -c "echo -e 'user $MQTT_USER\ntopic readwrite #\n' > $ACL_FILE"

echo "✅ Fixing permissions..."
sudo chmod 666 $PWD_FILE
sudo chmod 666 $ACL_FILE

echo "✅ Restarting Mosquitto Broker..."
sudo systemctl restart mosquitto

echo "============================================"
echo "🎉 SUCCESS! Mosquitto is completely reset."
echo "   User '$MQTT_USER' is fully authorized."
echo "   All corrupted/stale devices have been erased."
echo "============================================"
