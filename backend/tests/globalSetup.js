const initDb = require('../src/utils/initDb');

module.exports = async () => {
    console.log("Global setup: Initializing database once before tests...");
    await initDb();
};
