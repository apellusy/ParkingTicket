require('dotenv').config();

module.exports = {
    secret: process.env.JWT_SECRET || 'parking_management_default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: '7d',
    algorithm: 'HS256'
};
