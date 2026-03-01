const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const jwtConfig = require('../config/jwt');
const { User, ActivityLog } = require('../models');

// Validation rules
const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be 3-50 characters'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format'),
    body('role')
        .optional()
        .isIn(['admin', 'operator', 'security'])
        .withMessage('Invalid role')
];

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            role: user.role
        },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
    );
};

// Login controller
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Contact administrator.'
            });
        }

        // Validate password
        const isValid = await user.validatePassword(password);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Update last login
        await user.update({ lastLogin: new Date() });

        // Generate token
        const token = generateToken(user);

        // Log activity
        await ActivityLog.log({
            userId: user.id,
            action: 'LOGIN',
            details: { method: 'password' },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toJSON(),
                token,
                expiresIn: jwtConfig.expiresIn
            }
        });
    } catch (error) {
        next(error);
    }
};

// Register new user (admin only)
const register = async (req, res, next) => {
    try {
        const { username, password, email, role, fullName } = req.body;

        // Check if username exists
        const existingUser = await User.findOne({ where: { username } });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Create user
        const user = await User.create({
            username,
            password,
            email,
            role: role || 'operator',
            fullName
        });

        // Log activity
        await ActivityLog.log({
            userId: req.userId,
            action: 'CREATE_USER',
            entityType: 'user',
            entityId: user.id,
            details: { newUsername: username, role: user.role },
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { user: user.toJSON() }
        });
    } catch (error) {
        next(error);
    }
};

// Get current user profile
const getProfile = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: { user: req.user.toJSON() }
        });
    } catch (error) {
        next(error);
    }
};

// Update profile
const updateProfile = async (req, res, next) => {
    try {
        const { email, fullName, currentPassword, newPassword } = req.body;
        const user = req.user;

        // If changing password, verify current password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required to set new password'
                });
            }

            const isValid = await user.validatePassword(currentPassword);
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            await user.update({ password: newPassword });
        }

        // Update other fields
        if (email !== undefined) user.email = email;
        if (fullName !== undefined) user.fullName = fullName;
        await user.save();

        // Log activity
        await ActivityLog.log({
            userId: user.id,
            action: 'UPDATE_PROFILE',
            details: { fields: Object.keys(req.body) },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user: user.toJSON() }
        });
    } catch (error) {
        next(error);
    }
};

// Logout (optional - mainly for activity logging)
const logout = async (req, res, next) => {
    try {
        await ActivityLog.log({
            userId: req.userId,
            action: 'LOGOUT',
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Verify token (for frontend auth check)
const verifyToken = async (req, res) => {
    res.json({
        success: true,
        data: {
            user: req.user.toJSON(),
            valid: true
        }
    });
};

module.exports = {
    login,
    register,
    getProfile,
    updateProfile,
    logout,
    verifyToken,
    loginValidation,
    registerValidation
};
