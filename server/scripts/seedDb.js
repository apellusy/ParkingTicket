require('dotenv').config();
const { sequelize } = require('../config/database');
const { User, Rate, Setting, syncDatabase } = require('../models');

const seedData = async () => {
    try {
        // Sync all models
        await syncDatabase();

        // Create default admin user
        const [, adminCreated] = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                email: 'admin@smartparking.com',
                fullName: 'System Administrator'
            }
        });
        // Create default operator
        const [, operatorCreated] = await User.findOrCreate({
            where: { username: 'operator' },
            defaults: {
                username: 'operator',
                password: 'operator123',
                role: 'operator',
                email: 'operator@smartparking.com',
                fullName: 'Default Operator'
            }
        });
        // Create default rates (in IDR)
        const defaultRates = [
            { vehicleType: 'motorcycle', ratePerHour: 2000,  dailyMax: 15000, gracePeriodMinutes: 15, lostTicketFee: 50000,  firstHourRate: 2000 },
            { vehicleType: 'car',        ratePerHour: 5000,  dailyMax: 40000, gracePeriodMinutes: 15, lostTicketFee: 100000, firstHourRate: 5000 },
            { vehicleType: 'suv',        ratePerHour: 7000,  dailyMax: 50000, gracePeriodMinutes: 15, lostTicketFee: 125000, firstHourRate: 7000 },
            { vehicleType: 'truck',      ratePerHour: 10000, dailyMax: 75000, gracePeriodMinutes: 15, lostTicketFee: 150000, firstHourRate: 10000 }
        ];

        for (const rateData of defaultRates) {
            const [, created] = await Rate.findOrCreate({
                where: { vehicleType: rateData.vehicleType, isActive: true },
                defaults: rateData
            });
        }

        // Create default settings
        // General settings
        const defaultSettings = [
            { key: 'max_capacity',      value: 100,                              description: 'Maximum parking capacity',          category: 'general' },
            { key: 'parking_name',      value: 'Smart Parking',                  description: 'Parking facility name',             category: 'general' },
            { key: 'parking_address',   value: 'Address',    description: 'Parking address',                   category: 'general' },
            { key: 'enable_lpr',        value: true,                             description: 'Enable license plate recognition',  category: 'general' },
            { key: 'enable_monthly_pass', value: true,                           description: 'Enable monthly pass system',        category: 'general' },

            // Regulation settings stored as JSON objects in setting_value
            {
                key: 'regulation_auto_mark_lost',
                value: {
                    enabled: true,
                    mode: 'daily',         // 'daily' | 'scheduled'
                    cutoffTime: '07:00',   // used by daily mode
                    scheduledDate: '',     // used by scheduled mode (YYYY-MM-DD)
                    scheduledTime: '07:00' // used by scheduled mode
                },
                description: 'Auto mark lost ticket regulation settings',
                category: 'regulation'
            },
            {
                key: 'regulation_auto_report',
                value: {
                    enabled: true,
                    reportTime: '08:00'
                },
                description: 'Auto report regulation settings',
                category: 'regulation'
            }
        ];

        for (const setting of defaultSettings) {
            await Setting.set(setting.key, setting.value, setting.description);
        }
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

seedData();