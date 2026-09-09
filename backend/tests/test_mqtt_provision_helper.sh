#!/bin/bash
set -e

echo "Running bash helper tests..."

TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

cp backend/scripts/mqtt_provision_helper.sh "$TEST_DIR/helper.sh"

# Create mock infrastructure
mkdir -p "$TEST_DIR/mosquitto/config"
touch "$TEST_DIR/mosquitto/config/mosquitto.passwd"
touch "$TEST_DIR/mosquitto/config/mosquitto.acl"

# Mock binaries
mkdir -p "$TEST_DIR/bin"
cat <<'EOF' > "$TEST_DIR/bin/mosquitto_passwd"
#!/bin/bash
echo "MOCK_MOSQUITTO_PASSWD" "$@" >> "$TEST_DIR/mock.log"
EOF
chmod +x "$TEST_DIR/bin/mosquitto_passwd"

cat <<'EOF' > "$TEST_DIR/bin/systemctl"
#!/bin/bash
echo "MOCK_SYSTEMCTL" "$@" >> "$TEST_DIR/mock.log"
EOF
chmod +x "$TEST_DIR/bin/systemctl"

# Modify helper to use test paths and mock echo MOCK_CHOWN
sed -i.bak -e "s|/usr/bin/mosquitto_passwd|$TEST_DIR/bin/mosquitto_passwd|g" \
           -e "s|/home/ubuntu/iot.Mydevice|$TEST_DIR|g" \
           -e "s|/bin/systemctl|$TEST_DIR/bin/systemctl|g" \
           -e "s|/run/mydevice|$TEST_DIR/run|g" \
           -e "s|echo MOCK_CHOWN|echo MOCK_CHOWN|g" \
           "$TEST_DIR/helper.sh"

# Test 1: chmod failure prevents reload
echo "Test 1: chmod failure prevents reload"
cat <<'EOF' > "$TEST_DIR/bin/chmod_fail.sh"
#!/bin/bash
echo "Mock chmod failing"
exit 1
EOF
chmod +x "$TEST_DIR/bin/chmod_fail.sh"

# Inject chmod failure into helper
sed -i.bak -e 's|chmod 0640|"$TEST_DIR/bin/chmod_fail.sh" 0640|g' "$TEST_DIR/helper.sh"

> "$TEST_DIR/mock.log"
echo "secret1234567890" | "$TEST_DIR/helper.sh" add DEV-123-ABCD || true

if grep -q "MOCK_SYSTEMCTL reload" "$TEST_DIR/mock.log"; then
    echo "FAIL: systemctl reload was called even though chmod failed!"
    exit 1
else
    echo "PASS: chmod failure prevented reload."
fi

# Restore helper
cp backend/scripts/mqtt_provision_helper.sh "$TEST_DIR/helper.sh"
sed -i.bak -e "s|/usr/bin/mosquitto_passwd|$TEST_DIR/bin/mosquitto_passwd|g" \
           -e "s|/home/ubuntu/iot.Mydevice|$TEST_DIR|g" \
           -e "s|/bin/systemctl|$TEST_DIR/bin/systemctl|g" \
           -e "s|/run/mydevice|$TEST_DIR/run|g" \
           "$TEST_DIR/helper.sh"

# Test 2: chown failure prevents reload
echo "Test 2: chown failure prevents reload"
cat <<'EOF' > "$TEST_DIR/bin/chown_fail.sh"
#!/bin/bash
echo "Mock chown failing"
exit 1
EOF
chmod +x "$TEST_DIR/bin/chown_fail.sh"

sed -i.bak -e 's|chown mosquitto:mosquitto|"$TEST_DIR/bin/chown_fail.sh" mosquitto:mosquitto|g' "$TEST_DIR/helper.sh"

> "$TEST_DIR/mock.log"
echo "secret1234567890" | "$TEST_DIR/helper.sh" add DEV-123-ABCD || true

if grep -q "MOCK_SYSTEMCTL reload" "$TEST_DIR/mock.log"; then
    echo "FAIL: systemctl reload was called even though chown failed!"
    exit 1
else
    echo "PASS: chown failure prevented reload."
fi

echo "ALL BASH HELPER TESTS PASSED!"
