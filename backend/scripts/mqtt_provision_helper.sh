#!/bin/bash
# ----------------------------------------------------------------------------
# Privileged Provisioning Helper Script for Mosquitto
# ----------------------------------------------------------------------------
# This script is designed to be executed via sudo (NOPASSWD) by the Node.js
# backend process. It serves as an ironclad security boundary.
#
# Rules:
# - Absolutely no user-supplied file paths.
# - Device secret must be passed via STDIN to prevent process snooping.
# - Validates device ID strictness.
# - Refuses to modify the backend service account.
# - Append-only ACL design (no full file rewrites).
# - Uses file locking to prevent race conditions.
# - Explicitly enforces permissions to prevent ownership drift.
# ----------------------------------------------------------------------------

set -euo pipefail

# HARDCODED PATHS - DO NOT CHANGE WITHOUT SYSADMIN
MOSQUITTO_PASSWD="/usr/bin/mosquitto_passwd"
PASSWD_FILE="/home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.passwd"
ACL_FILE="/home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.acl"
SYSTEMCTL="/bin/systemctl"
LOCK_DIR="/run/mydevice"
LOCK_FILE="${LOCK_DIR}/mosquitto_provision.lock"

# Verify infrastructure exists
if [ ! -f "$PASSWD_FILE" ]; then
    echo "ERROR: Password file $PASSWD_FILE does not exist." >&2
    exit 2
fi

if [ ! -f "$ACL_FILE" ]; then
    echo "ERROR: ACL file $ACL_FILE does not exist." >&2
    exit 2
fi

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <add|remove> <device_id>" >&2
    exit 3
fi

ACTION="$1"
DEVICE_ID="$2"

# 1. Strict Validation
if [[ ! "$DEVICE_ID" =~ ^DEV-[a-zA-Z0-9\-]+$ ]]; then
    echo "ERROR: Invalid device ID format: $DEVICE_ID" >&2
    exit 4
fi

if [[ "$DEVICE_ID" == "mydevice_backend" || "$DEVICE_ID" == "backend_admin" ]]; then
    echo "ERROR: Refusing to modify backend service account." >&2
    exit 5
fi

# 2. Preparation
# Ensure the runtime lock directory exists securely
mkdir -p "$LOCK_DIR"
chown root:root "$LOCK_DIR"
chmod 0755 "$LOCK_DIR"

# 3. Execution Routing (Wrapped in flock to prevent race conditions)
(
    # Obtain exclusive lock on FD 200
    flock -x 200

    if [ "$ACTION" == "add" ]; then
        # Read secret from stdin securely
        read -r -s SECRET_KEY
        
        if [ -z "$SECRET_KEY" ]; then
            echo "ERROR: Empty secret provided via stdin." >&2
            exit 6
        fi
        
        if [ "${#SECRET_KEY}" -lt 16 ]; then
            echo "ERROR: Secret is too short." >&2
            exit 6
        fi

        # Step 1: Add Authentication
        # We pipe the password twice to mosquitto_passwd to avoid process arguments 
        # and avoid plaintext touching the disk at all.
        (echo -n "$SECRET_KEY"; echo; echo -n "$SECRET_KEY"; echo) | $MOSQUITTO_PASSWD "$PASSWD_FILE" "$DEVICE_ID" >/dev/null 2>&1

        # Step 2: Add Authorization (Idempotent Append)
        # We check if the user block already exists to prevent duplicate rules.
        if grep -q "^user $DEVICE_ID$" "$ACL_FILE"; then
            echo "INFO: ACL block for $DEVICE_ID already exists. Skipping append."
        else
            # Append only the allowed topics safely
            cat <<EOF >> "$ACL_FILE"

user $DEVICE_ID
topic read devices/$DEVICE_ID/command
topic write devices/$DEVICE_ID/data
topic write devices/$DEVICE_ID/status
topic write devices/$DEVICE_ID/capabilities
topic write devices/$DEVICE_ID/command/ack
EOF
        fi

        # Step 3: Enforce permissions strictly. Failure here will cause script to exit.
        chown mosquitto:mosquitto "$PASSWD_FILE" "$ACL_FILE"
        chmod 0640 "$PASSWD_FILE" "$ACL_FILE"

        # Step 4: Reload Broker
        $SYSTEMCTL reload mosquitto
        echo "SUCCESS: Device $DEVICE_ID provisioned and broker reloaded."
        exit 0

    elif [ "$ACTION" == "remove" ]; then
        # Step 1: Revoke Authentication
        $MOSQUITTO_PASSWD -D "$PASSWD_FILE" "$DEVICE_ID"

        # Step 2: Enforce permissions strictly. Failure here will cause script to exit.
        chown mosquitto:mosquitto "$PASSWD_FILE" "$ACL_FILE"
        chmod 0640 "$PASSWD_FILE" "$ACL_FILE"

        # Step 3: Reload Broker
        # Note: The ACL block is intentionally left untouched as an inert rule.
        $SYSTEMCTL reload mosquitto
        echo "SUCCESS: Device $DEVICE_ID revoked and broker reloaded."
        exit 0

    else
        echo "ERROR: Invalid action: $ACTION" >&2
        exit 3
    fi

) 200>"$LOCK_FILE"
