const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    entityType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Type of entity affected (ticket, payment, user, etc.)'
    },
    entityId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const value = this.getDataValue('details');
            return value ? JSON.parse(value) : null;
        },
        set(value) {
            this.setDataValue('details', value ? JSON.stringify(value) : null);
        }
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'activity_logs',
    updatedAt: false,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['action'] },
        { fields: ['created_at'] },
        { fields: ['entity_type', 'entity_id'] }
    ]
});

// Helper to log activity
ActivityLog.log = async function (data) {
    try {
        await this.create(data);
    } catch (error) {
        console.error('Failed to log activity:', error.message);
    }
};

module.exports = ActivityLog;
