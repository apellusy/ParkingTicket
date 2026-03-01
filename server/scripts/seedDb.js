/**
 * Database Seeder - Creates default admin user and initial rates
 */
require('dotenv').config();
const { sequelize } = require('../config/database');
const { User, Rate, Setting, syncDatabase } = require('../models');

const seedData = async () => {
    try {
        console.log('🌱 Starting database seed...\n');

        // Sync database
        await syncDatabase();

        // Create default admin user
        const [adminUser, adminCreated] = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                email: 'admin@smartparking.com',
                fullName: 'System Administrator'
            }
        });

        if (adminCreated) {
            console.log('✅ Created default admin user: admin / admin123');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // Create default operator
        const [operatorUser, operatorCreated] = await User.findOrCreate({
            where: { username: 'operator' },
            defaults: {
                username: 'operator',
                password: 'operator123',
                role: 'operator',
                email: 'operator@smartparking.com',
                fullName: 'Default Operator'
            }
        });

        if (operatorCreated) {
            console.log('✅ Created default operator: operator / operator123');
        }

        // Create default rates (in IDR)
        const defaultRates = [
            {
                vehicleType: 'motorcycle',
                ratePerHour: 2000,
                dailyMax: 15000,
                gracePeriodMinutes: 15,
                lostTicketFee: 50000,
                firstHourRate: 2000
            },
            {
                vehicleType: 'car',
                ratePerHour: 5000,
                dailyMax: 40000,
                gracePeriodMinutes: 15,
                lostTicketFee: 100000,
                firstHourRate: 5000
            },
            {
                vehicleType: 'suv',
                ratePerHour: 7000,
                dailyMax: 50000,
                gracePeriodMinutes: 15,
                lostTicketFee: 125000,
                firstHourRate: 7000
            },
            {
                vehicleType: 'truck',
                ratePerHour: 10000,
                dailyMax: 75000,
                gracePeriodMinutes: 15,
                lostTicketFee: 150000,
                firstHourRate: 10000
            }
        ];

        for (const rateData of defaultRates) {
            const [rate, created] = await Rate.findOrCreate({
                where: { vehicleType: rateData.vehicleType, isActive: true },
                defaults: rateData
            });

            if (created) {
                console.log(`✅ Created rate for ${rateData.vehicleType}: Rp. ${rateData.ratePerHour.toLocaleString('id-ID')}/hour`);
            }
        }

        // Create default settings
        const defaultSettings = [
            { key: 'max_capacity', value: 100, description: 'Maximum parking capacity' },
            { key: 'parking_name', value: 'Smart Parking', description: 'Parking facility name' },
            { key: 'parking_address', value: 'Jl. Contoh No. 123, Jakarta', description: 'Parking address' },
            { key: 'currency', value: 'IDR', description: 'Currency code' },
            { key: 'currency_symbol', value: 'Rp.', description: 'Currency symbol' },
            { key: 'receipt_footer', value: 'Terima kasih atas kunjungan Anda!', description: 'Receipt footer text' },
            { key: 'enable_lpr', value: true, description: 'Enable license plate recognition' },
            { key: 'enable_monthly_pass', value: true, description: 'Enable monthly pass system' }
        ];

        for (const setting of defaultSettings) {
            await Setting.set(setting.key, setting.value, setting.description);
        }
        console.log('✅ Created default system settings');

        console.log('\n🎉 Database seeding completed successfully!\n');
        console.log('══════════════════════════════════════════');
        console.log('  Default Login Credentials:');
        console.log('  Admin:    admin / admin123');
        console.log('  Operator: operator / operator123');
        console.log('══════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

seedData();
