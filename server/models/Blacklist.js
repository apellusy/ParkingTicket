const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Blacklist = sequelize.define('Blacklist', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    plateNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        set(value) {
            this.setDataValue('plateNumber', value.toUpperCase().replace(/\s+/g, ''));
        }
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    severity: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium'
    },
    addedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Optional expiration date for temporary bans'
    }
}, {
    tableName: 'blacklist',
    indexes: [
        { fields: ['plate_number'] },
        { fields: ['is_active'] }
    ]
});

// Check if plate is blacklisted
Blacklist.isBlacklisted = async function (plateNumber) {
    const normalizedPlate = plateNumber.toUpperCase().replace(/\s+/g, '');
    const record = await this.findOne({
        where: {
            plateNumber: normalizedPlate,
            isActive: true
        }
    });

    if (record && record.expiresAt && new Date() > record.expiresAt) {
        // Expired, deactivate and return false
        await record.update({ isActive: false });
        return null;
    }

    return record;
};

module.exports = Blacklist;
