const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateToken, optionalAuth, authorizeRoles } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validation');
const { ticketLimiter } = require('../middleware/rateLimiter');

/**
 * @route POST /api/tickets
 * @desc Create new parking ticket (entry)
 * @access Public
 */
router.post(
    '/',
    ticketLimiter,
    optionalAuth,
    ticketController.createTicketValidation,
    handleValidationErrors,
    ticketController.createTicket
);

/**
 * @route GET /api/tickets/active
 * @desc Get all active tickets (Admin/Operator)
 * @access Private (Admin/Operator)
 */
router.get(
    '/active',
    authenticateToken,
    authorizeRoles('admin', 'operator'),
    ticketController.getActiveTickets
);

/**
 * @route GET /api/tickets/my-tickets
 * @desc Get current user's active tickets (Customer)
 * @access Private (Customer)
 */
router.get(
    '/my-tickets',
    authenticateToken,
    ticketController.getMyTickets
);

/**
 * @route GET /api/tickets/search
 * @desc Search tickets
 * @access Private
 */
router.get(
    '/search',
    authenticateToken,
    ticketController.searchTickets
);

/**
 * @route POST /api/tickets/:identifier/print
 * @desc Log print action for ticket (for reprint)
 * @access Private
 */
router.post(
    '/:identifier/print',
    authenticateToken,
    ticketController.printTicket
);

/**
 * @route GET /api/tickets/:identifier
 * @desc Get ticket by ID or ticket number
 * @access Public (for exit) / Private (for details)
 */
router.get(
    '/:identifier',
    optionalAuth,
    ticketController.getTicket
);

/**
 * @route PUT /api/tickets/:identifier/lost
 * @desc Mark ticket as lost
 * @access Private (Operator+)
 */
router.put(
    '/:identifier/lost',
    authenticateToken,
    authorizeRoles('admin', 'operator'),
    ticketController.markTicketLost
);

/**
 * @route DELETE /api/tickets/:id
 * @desc Cancel ticket
 * @access Private (Admin)
 */
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('admin'),
    ticketController.cancelTicket
);

module.exports = router;