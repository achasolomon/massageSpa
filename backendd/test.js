const sequelize = require('./src/config/database'); // Corrected path

async function test() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database");
  } catch (err) {
    console.error("❌ Connection failed:", err);
  }
}

test();
