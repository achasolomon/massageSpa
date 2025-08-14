require("dotenv").config(); // Load environment variables from .env file

module.exports = {
  port: process.env.PORT || 5001,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "fallback_secret_key",
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  // clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
    // clientUrl: process.env.CLIENT_URL || "https://spa.algosoftwarelabs.com",
    clientUrl: process.env.CLIENT_URL.split(',').map(url => url.trim())

 
};

