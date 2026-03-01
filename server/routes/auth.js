const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post(
    '/login',
    authLimiter,
    authController.loginValidation,
    handleValidationErrors,
    authController.login
);

/**
 * @route POST /api/auth/register
 * @desc Register new user (admin only)
 * @access Private (Admin)
 */
router.post(
    '/register',
    authenticateToken,
    authController.registerValidation,
    handleValidationErrors,
    authController.register
);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authenticateToken, authController.updateProfile);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route GET /api/auth/verify
 * @desc Verify JWT token
 * @access Private
 */
router.get('/verify', authenticateToken, authController.verifyToken);

module.exports = router;
