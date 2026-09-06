afterAll(async () => {
    const { getMqttClient } = require('../src/mqtt/client');
    const mainClient = getMqttClient();
    if (mainClient) {
        mainClient.end(true);
    }

});
