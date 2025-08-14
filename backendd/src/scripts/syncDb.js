const { sequelize } = require("../models/index"); // Corrected path

async function syncDb() {
    try {
        console.log("Starting database synchronization...");
        // Use { alter: true } in development to avoid dropping tables, 
        // but use { force: true } for a clean slate if needed (careful!).
        // In production, use migrations instead.
        await sequelize.sync({ alter: true }); 
        console.log("Database synchronized successfully.");
    } catch (error) {
        console.error("Error synchronizing database:", error);
        process.exit(1);
    } finally {
        // Close the connection if the script is meant to exit
        // await sequelize.close(); 
    }
}

// Run the sync function if this script is executed directly
if (require.main === module) {
    syncDb();
}

