# Test Plan

| Test Case | Description | Result |
| :--- | :--- | :--- |
| **Registration test** | Register a new user via API/Dashboard. | NOT TESTED |
| **Login test** | Login with valid credentials and receive token. | NOT TESTED |
| **Device creation test** | Add a device for the logged-in user. | NOT TESTED |
| **Authentication test** | Device connects to MQTT with correct ID/Key. | NOT TESTED |
| **Invalid credential test** | Device fails to connect with wrong Key. | NOT TESTED |
| **Telemetry test** | Device publishes data; backend stores it. | NOT TESTED |
| **Database test** | Verify records appear in SQL tables correctly. | NOT TESTED |
| **Status test** | Device disconnects; status updates to offline. | NOT TESTED |
| **Command test** | Backend publishes command; device receives it. | NOT TESTED |
| **LED test** | Command triggers physical LED state change. | NOT TESTED |
| **Dashboard test** | Dashboard displays new telemetry in real time. | NOT TESTED |
| **Reconnect test** | Restart Wi-Fi; device should reconnect automatically. | NOT TESTED |
| **Unauthorized-access test** | Try to read another user's device data. | NOT TESTED |
