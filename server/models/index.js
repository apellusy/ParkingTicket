const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Ticket = require('./Ticket');
const Payment = require('./Payment');
const Rate = require('./Rate');
const PlateCapture = require('./PlateCapture');
const Blacklist = require('./Blacklist');
const MonthlyPass = require('./MonthlyPass');
const ActivityLog = require('./ActivityLog');
const Setting = require('./Setting');

// Define Relationships

// User -> Payment (operator who processed payment)
User.hasMany(Payment, { foreignKey: 'operatorId', as: 'processedPayments' });
Payment.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

// User -> ActivityLog
User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activities' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> Blacklist (who added blacklist entry)
User.hasMany(Blacklist, { foreignKey: 'addedBy', as: 'blacklistEntries' });
Blacklist.belongsTo(User, { foreignKey: 'addedBy', as: 'addedByUser' });

// Ticket -> Payment
Ticket.hasOne(Payment, { foreignKey: 'ticketId', as: 'payment' });
Payment.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });

// Ticket -> PlateCapture
Ticket.hasMany(PlateCapture, { foreignKey: 'ticketId', as: 'plateCaptures' });
PlateCapture.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });

// Sync all models
const syncDatabase = async () => {
    try {
        await sequelize.sync();
        console.log('All models synchronized successfully.');
    } catch (error) {
        console.error('Error synchronizing models:', error.message);
        throw error;
    }
};


module.exports = {
    sequelize,
    User,
    Ticket,
    Payment,
    Rate,
    PlateCapture,
    Blacklist,
    MonthlyPass,
    ActivityLog,
    Setting,
    syncDatabase
};
