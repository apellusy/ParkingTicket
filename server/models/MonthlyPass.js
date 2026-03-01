const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MonthlyPass = sequelize.define('MonthlyPass', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    passNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    plateNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        set(value) {
            this.setDataValue('plateNumber', value.toUpperCase().replace(/\s+/g, ''));
        }
    },
    holderName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    holderContact: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    holderEmail: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    vehicleType: {
        type: DataTypes.ENUM('car', 'motorcycle', 'truck', 'suv'),
        allowNull: false,
        defaultValue: 'car'
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    monthlyFee: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    qrCodeData: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'suspended', 'cancelled'),
        defaultValue: 'active'
    }
}, {
    tableName: 'monthly_passes',
    hooks: {
        beforeCreate: (pass) => {
            if (!pass.passNumber) {
                // Generate pass number: PASS-YYYYMM-XXXX
                const date = new Date();
                const dateStr = date.toISOString().slice(0, 7).replace(/-/g, '');
                const random = Math.floor(1000 + Math.random() * 9000);
                pass.passNumber = `PASS-${dateStr}-${random}`;
            }
        }
    },
    indexes: [
        { fields: ['plate_number'] },
        { fields: ['pass_number'] },
        { fields: ['status'] }
    ]
});

// Check if pass is valid
MonthlyPass.prototype.isValid = function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(this.endDate);
    endDate.setHours(23, 59, 59, 999);

    return this.status === 'active' && today <= endDate;
};

// Find valid pass by plate
MonthlyPass.findValidByPlate = async function (plateNumber) {
    const normalizedPlate = plateNumber.toUpperCase().replace(/\s+/g, '');
    const today = new Date().toISOString().slice(0, 10);

    return await this.findOne({
        where: {
            plateNumber: normalizedPlate,
            status: 'active',
            startDate: { [require('sequelize').Op.lte]: today },
            endDate: { [require('sequelize').Op.gte]: today }
        }
    });
};

module.exports = MonthlyPass;
