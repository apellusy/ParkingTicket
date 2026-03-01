const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlateCapture = sequelize.define('PlateCapture', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'tickets',
            key: 'id'
        }
    },
    plateNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        set(value) {
            this.setDataValue('plateNumber', value.toUpperCase().replace(/\s+/g, ''));
        }
    },
    imagePath: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    captureType: {
        type: DataTypes.ENUM('entry', 'exit'),
        allowNull: false
    },
    confidenceScore: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'OCR confidence percentage'
    },
    rawOcrText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Raw OCR output before processing'
    },
    isManualOverride: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    capturedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'plate_captures',
    indexes: [
        { fields: ['ticket_id'] },
        { fields: ['plate_number'] },
        { fields: ['captured_at'] }
    ]
});

module.exports = PlateCapture;
