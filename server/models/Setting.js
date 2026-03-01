const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Setting = sequelize.define('Setting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    settingKey: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    settingValue: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const value = this.getDataValue('settingValue');
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        },
        set(value) {
            this.setDataValue('settingValue',
                typeof value === 'object' ? JSON.stringify(value) : String(value)
            );
        }
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'general'
    }
}, {
    tableName: 'settings',
    indexes: [
        { fields: ['setting_key'] },
        { fields: ['category'] }
    ]
});

// Get setting by key
Setting.get = async function (key, defaultValue = null) {
    const setting = await this.findOne({ where: { settingKey: key } });
    return setting ? setting.settingValue : defaultValue;
};

// Set setting value
Setting.set = async function (key, value, description = null) {
    const [setting, created] = await this.findOrCreate({
        where: { settingKey: key },
        defaults: { settingValue: value, description }
    });

    if (!created) {
        await setting.update({ settingValue: value });
    }

    return setting;
};

module.exports = Setting;
