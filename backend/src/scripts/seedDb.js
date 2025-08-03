const db = require("../models");
const sequelize = require("../config/database");
require("dotenv").config(); // Load environment variables

// Helper: Generate time slots
const TIME_SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];
const DAYS_OF_WEEK = [1, 2, 4, 6]; // Monday, Tuesday, Thursday, Saturday

async function seedDatabase() {
    try {
        console.log("Starting database seeding...");

        if (process.env.NODE_ENV === "production") {
            console.error("Seeding script should not run in production.");
            return;
        }

        // 🔥 Clear existing data (in correct order due to FK constraints)
        console.log("Clearing existing data...");

        // Disable foreign key checks temporarily (MySQL specific)
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        try {
            // Clear in reverse dependency order
            await db.ServiceAvailability.destroy({ where: {}, truncate: true });
            await db.ServiceOption.destroy({ where: {}, truncate: true });
            await db.Service.destroy({ where: {}, truncate: true });
            await db.Therapist.destroy({ where: {}, truncate: true });
            await db.Client.destroy({ where: {}, truncate: true });
            await db.User.destroy({ where: {}, truncate: true });
            await db.Role.destroy({ where: {}, truncate: true });
            
            console.log("Existing data cleared.");
        } finally {
            // Re-enable foreign key checks
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        }

        // 1. Seed Roles
        console.log("Seeding Roles...");
        const roles = [
            { name: "admin", description: "Full access to the system" },
            { name: "staff", description: "Manage bookings, clients, schedules" },
            { name: "therapist", description: "Own schedule, bookings, clinical notes" },
            { name: "client", description: "Can book appointments" },
        ];
        await db.Role.bulkCreate(roles);
        const roleMap = {};
        const allRoles = await db.Role.findAll();
        allRoles.forEach(role => {
            roleMap[role.name] = role.id;
        });
        console.log("Roles seeded.");

        // 2. Seed Admin User
        console.log("Seeding Admin User...");
        const adminEmail = "admin@example.com";
        const adminPassword = "password123";

        const adminUser = await db.User.create({
            firstName: "Admin",
            lastName: "User",
            email: adminEmail,
            password: adminPassword,
            roleId: roleMap["admin"],
            isActive: true,
        });
        console.log(`Admin user created: ${adminEmail} / ${adminPassword}`);

        // 3. Seed Therapists
        console.log("Seeding Therapists...");
        const therapists = [
            {
                user: {
                    firstName: "Alice",
                    lastName: "Therapist",
                    email: "alice.therapist@example.com",
                    password: "password123",
                    roleId: roleMap["therapist"],
                    isActive: true,
                },
                profile: {
                    specialties: ["Swedish", "Deep Tissue"],
                    bio: "Experienced in various massage techniques."
                }
            },
            {
                user: {
                    firstName: "Bob",
                    lastName: "Healer",
                    email: "bob.healer@example.com",
                    password: "password123",
                    roleId: roleMap["therapist"],
                    isActive: true,
                },
                profile: {
                    specialties: ["Sports Massage", "Reflexology"],
                    bio: "Focuses on sports injuries and recovery."
                }
            },
        ];

        for (const { user, profile } of therapists) {
            const therapistUser = await db.User.create(user);
            await db.Therapist.create({
                ...profile,
                userId: therapistUser.id,
                isActive: true,
            });
            console.log(`Therapist created: ${user.email} / ${user.password}`);
        }

        // 4. Seed Services (with options and availability)
        console.log("Seeding Services with Options and Availability...");
        const services = [
            {
                name: "Swedish Massage",
                description: "Relaxing full-body massage.",
                category: "Massage",
                isActive: true,
                options: [
                    { duration: 60, price: 80.00, optionName: "Standard" },
                    { duration: 90, price: 110.00, optionName: "Extended" }
                ]
            },
            {
                name: "Deep Tissue Massage",
                description: "Targets deeper layers of muscle.",
                category: "Massage",
                isActive: true,
                options: [
                    { duration: 60, price: 95.00, optionName: "Standard" },
                    { duration: 90, price: 130.00, optionName: "Intensive" }
                ]
            },
            {
                name: "Sports Massage",
                description: "Focuses on athletic recovery and tension.",
                category: "Massage",
                isActive: true,
                options: [
                    { duration: 75, price: 110.00, optionName: "Standard" },
                    { duration: 120, price: 170.00, optionName: "Pro Athlete" }
                ]
            },
            {
                name: "Hot Stone Massage",
                description: "Uses heated stones for deep muscle relaxation.",
                category: "Massage",
                isActive: false,
                options: [
                    { duration: 90, price: 120.00, optionName: "Hot Stone" }
                ]
            },
        ];

        // Get all therapists for availability assignment
        const allTherapists = await db.Therapist.findAll();

        for (const serviceData of services) {
            // Create the service
            const service = await db.Service.create({
                name: serviceData.name,
                description: serviceData.description,
                category: serviceData.category,
                isActive: serviceData.isActive,
            });

            // Create service options and store them
            const createdOptions = [];
            for (const option of serviceData.options) {
                const serviceOption = await db.ServiceOption.create({
                    serviceId: service.id,
                    duration: option.duration,
                    price: option.price,
                    optionName: option.optionName,
                    isActive: true
                });
                createdOptions.push(serviceOption);
            }

            // Create availability for each service option
            for (const serviceOption of createdOptions) {
                // For each therapist
                for (const therapist of allTherapists) {
                    // Create availability for Mon, Tue, Thu, Sat, all slots
                    for (const dayOfWeek of DAYS_OF_WEEK) {
                        for (const time of TIME_SLOTS) {
                            // Check if availability already exists before creating
                            const exists = await db.ServiceAvailability.findOne({
                                where: {
                                    serviceId: service.id,
                                    serviceOptionId: serviceOption.id,
                                    therapistId: therapist.id,
                                    dayOfWeek: dayOfWeek,
                                    startTime: time
                                }
                            });

                            if (!exists) {
                                await db.ServiceAvailability.create({
                                    serviceId: service.id,
                                    serviceOptionId: serviceOption.id,
                                    therapistId: therapist.id,
                                    dayOfWeek: dayOfWeek,
                                    specificDate: null,
                                    startTime: time,
                                    bookingLimit: 3,
                                    isActive: true,
                                });
                            } else {
                                console.log(`Availability already exists for therapist ${therapist.id}, service ${service.id}, option ${serviceOption.id}, day ${dayOfWeek}, time ${time}`);
                            }
                        }
                    }
                }
            }
        }
        console.log("Services, options, and availability seeded.");

        // 5. Seed Sample Client
        console.log("Seeding Sample Client...");
        const client = await db.Client.create({
            firstName: "Test",
            lastName: "Client",
            email: "test.client@example.com",
            phone: "123-456-7890",
        });
        console.log(`Sample client created: ${client.email}`);

        console.log("✅ Database seeding completed successfully.");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    } finally {
        await db.sequelize.close();
        console.log("Database connection closed.");
    }
}

seedDatabase();