require('dotenv').config({ path: '.env.bench' });
const initDb = require('./src/utils/initDb');

initDb().then(() => {
    console.log("Benchmark DB initialized!");
    process.exit(0);
}).catch(err => {
    console.error("Failed to initialize benchmark DB:", err);
    process.exit(1);
});
