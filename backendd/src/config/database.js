const { Sequelize } = require("sequelize");
const config = require("./index");

if (!config.databaseUrl) {
  console.error("DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const sequelize = new Sequelize(config.databaseUrl, {
  // dialect: "postgres", // Explicitly state the dialect
  dialect: "mysql",

  logging: false, // Disable logging or use console.log for debugging
  // Optional: Add SSL configuration if required for your database connection
  // dialectOptions: {
  //   ssl: {
  //     require: true,
  //     rejectUnauthorized: false // Adjust based on your SSL certificate setup
  //   }
  // },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;

