const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tickets',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.ENUM('cash', 'card', 'digital', 'monthly_pass'),
        allowNull: false,
        defaultValue: 'cash'
    },
    durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    rateApplied: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Hourly rate applied at time of payment'
    },
    discountAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    },
    discountCode: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    receiptNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    },
    operatorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    paidAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'payments',
    hooks: {
        beforeCreate: (payment) => {
            if (!payment.receiptNumber) {
                // Generate receipt number: RCP-YYYYMMDD-XXXX
                const date = new Date();
                const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.floor(1000 + Math.random() * 9000);
                payment.receiptNumber = `RCP-${dateStr}-${random}`;
            }
        }
    },
    indexes: [
        { fields: ['ticket_id'] },
        { fields: ['payment_method'] },
        { fields: ['paid_at'] },
        { fields: ['operator_id'] }
    ]
});

module.exports = Payment;
