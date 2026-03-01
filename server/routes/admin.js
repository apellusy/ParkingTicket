const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { Ticket, Payment, User, Rate, Blacklist, ActivityLog, Setting, MonthlyPass } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const pricingService = require('../services/pricingService');

// All admin routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/admin/dashboard
 * @desc Get dashboard statistics
 * @access Private (Admin, Operator)
 */
router.get('/dashboard', async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Active tickets count
        const activeTickets = await Ticket.count({ where: { status: 'active' } });

        // Today's statistics
        const todayTickets = await Ticket.count({
            where: {
                entryTime: { [Op.gte]: today, [Op.lt]: tomorrow }
            }
        });

        const todayRevenue = await Payment.sum('amount', {
            where: {
                paidAt: { [Op.gte]: today, [Op.lt]: tomorrow }
            }
        }) || 0;

        const todayPayments = await Payment.count({
            where: {
                paidAt: { [Op.gte]: today, [Op.lt]: tomorrow }
            }
        });

        // Weekly revenue
        const weeklyRevenue = await Payment.sum('amount', {
            where: {
                paidAt: { [Op.gte]: startOfWeek }
            }
        }) || 0;

        // Monthly revenue
        const monthlyRevenue = await Payment.sum('amount', {
            where: {
                paidAt: { [Op.gte]: startOfMonth }
            }
        }) || 0;

        // Vehicle type distribution (today)
        const vehicleDistribution = await Ticket.findAll({
            where: {
                entryTime: { [Op.gte]: today }
            },
            attributes: [
                'vehicleType',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['vehicleType'],
            raw: true
        });

        // Recent activity
        const recentActivity = await ActivityLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 10,
            include: [{ model: User, as: 'user', attributes: ['username'] }]
        });

        // Capacity (from settings or default)
        const maxCapacity = await Setting.get('max_capacity', 100);

        res.json({
            success: true,
            data: {
                activeTickets,
                availableSpots: maxCapacity - activeTickets,
                maxCapacity,
                occupancyPercent: Math.round((activeTickets / maxCapacity) * 100),
                today: {
                    tickets: todayTickets,
                    payments: todayPayments,
                    revenue: todayRevenue,
                    formattedRevenue: pricingService.formatCurrency(todayRevenue)
                },
                weekly: {
                    revenue: weeklyRevenue,
                    formattedRevenue: pricingService.formatCurrency(weeklyRevenue)
                },
                monthly: {
                    revenue: monthlyRevenue,
                    formattedRevenue: pricingService.formatCurrency(monthlyRevenue)
                },
                vehicleDistribution,
                recentActivity: recentActivity.map(a => ({
                    id: a.id,
                    action: a.action,
                    user: a.user?.username || 'System',
                    details: a.details,
                    createdAt: a.createdAt
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/admin/users
 * @desc Get all users
 * @access Private (Admin)
 */
router.get('/users', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const users = await User.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: { users }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /api/admin/users/:id
 * @desc Update user
 * @access Private (Admin)
 */
router.put('/users/:id', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, isActive, email, fullName } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.update({ role, isActive, email, fullName });

        await ActivityLog.log({
            userId: req.userId,
            action: 'UPDATE_USER',
            entityType: 'user',
            entityId: user.id,
            details: { updatedFields: Object.keys(req.body) },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'User updated',
            data: { user: user.toJSON() }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route DELETE /api/admin/users/:id
 * @desc Deactivate user
 * @access Private (Admin)
 */
router.delete('/users/:id', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.update({ isActive: false });

        res.json({
            success: true,
            message: 'User deactivated'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/admin/rates
 * @desc Get all rates
 * @access Private
 */
router.get('/rates', async (req, res, next) => {
    try {
        const rates = await pricingService.getAllRates();
        res.json({
            success: true,
            data: { rates }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /api/admin/rates/:vehicleType
 * @desc Update rate for vehicle type
 * @access Private (Admin)
 */
router.put('/rates/:vehicleType', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { vehicleType } = req.params;
        const { ratePerHour, dailyMax, gracePeriodMinutes, lostTicketFee, firstHourRate } = req.body;

        const rate = await pricingService.updateRate(vehicleType, {
            ratePerHour,
            dailyMax,
            gracePeriodMinutes,
            lostTicketFee,
            firstHourRate
        });

        await ActivityLog.log({
            userId: req.userId,
            action: 'UPDATE_RATE',
            entityType: 'rate',
            entityId: rate.id,
            details: { vehicleType, ratePerHour },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Rate updated',
            data: { rate }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/admin/settings
 * @desc Get system settings
 * @access Private (Admin)
 */
router.get('/settings', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const settings = await Setting.findAll();

        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.settingKey] = s.settingValue;
        });

        res.json({
            success: true,
            data: { settings: settingsMap }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /api/admin/settings
 * @desc Update system settings
 * @access Private (Admin)
 */
router.put('/settings', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const updates = req.body;

        for (const [key, value] of Object.entries(updates)) {
            await Setting.set(key, value);
        }

        await ActivityLog.log({
            userId: req.userId,
            action: 'UPDATE_SETTINGS',
            details: { keys: Object.keys(updates) },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Settings updated'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/admin/blacklist
 * @desc Get blacklist
 * @access Private
 */
router.get('/blacklist', async (req, res, next) => {
    try {
        const blacklist = await Blacklist.findAll({
            where: { isActive: true },
            include: [{ model: User, as: 'addedByUser', attributes: ['username'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: { blacklist }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/admin/blacklist
 * @desc Add plate to blacklist
 * @access Private (Admin, Security)
 */
router.post('/blacklist', authorizeRoles('admin', 'security'), async (req, res, next) => {
    try {
        const { plateNumber, reason, severity, expiresAt } = req.body;

        const entry = await Blacklist.create({
            plateNumber,
            reason,
            severity: severity || 'medium',
            addedBy: req.userId,
            expiresAt: expiresAt || null
        });

        await ActivityLog.log({
            userId: req.userId,
            action: 'ADD_BLACKLIST',
            entityType: 'blacklist',
            entityId: entry.id,
            details: { plateNumber, reason },
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'Plate added to blacklist',
            data: { entry }
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Plate already blacklisted'
            });
        }
        next(error);
    }
});

/**
 * @route DELETE /api/admin/blacklist/:id
 * @desc Remove from blacklist
 * @access Private (Admin)
 */
router.delete('/blacklist/:id', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const entry = await Blacklist.findByPk(id);
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Entry not found'
            });
        }

        await entry.update({ isActive: false });

        await ActivityLog.log({
            userId: req.userId,
            action: 'REMOVE_BLACKLIST',
            entityType: 'blacklist',
            entityId: entry.id,
            details: { plateNumber: entry.plateNumber },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Removed from blacklist'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/admin/activity-logs
 * @desc Get activity logs
 * @access Private (Admin)
 */
router.get('/activity-logs', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 50, action, userId, fromDate, toDate } = req.query;

        const where = {};
        if (action) where.action = action;
        if (userId) where.userId = userId;
        if (fromDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(fromDate) };
        if (toDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(toDate) };

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: logs } = await ActivityLog.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['username'] }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
