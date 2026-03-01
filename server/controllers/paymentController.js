const { body } = require('express-validator');
const { Ticket, Payment, Rate, ActivityLog } = require('../models');

// Validation rules
const processPaymentValidation = [
    body('ticketId').isInt().withMessage('Valid ticket ID required'),
    body('paymentMethod')
        .isIn(['cash', 'card', 'digital', 'monthly_pass'])
        .withMessage('Invalid payment method'),
    body('amountPaid')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be positive'),
    body('discountCode')
        .optional()
        .trim()
];

// Calculate parking fee
const calculateFee = async (req, res, next) => {
    try {
        const { ticketId, ticketNumber, plateNumber } = req.query;

        let ticket;

        if (ticketId) {
            ticket = await Ticket.findByPk(ticketId);
        } else if (ticketNumber) {
            ticket = await Ticket.findOne({ where: { ticketNumber } });
        } else if (plateNumber) {
            ticket = await Ticket.findOne({
                where: {
                    plateNumber: plateNumber.toUpperCase().replace(/\s+/g, ''),
                    status: 'active'
                }
            });
        }

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        if (ticket.status !== 'active' && ticket.status !== 'lost') {
            return res.status(400).json({
                success: false,
                message: 'Ticket already processed'
            });
        }

        // Get rate
        const rate = await Rate.getActiveRate(ticket.vehicleType);

        if (!rate) {
            return res.status(500).json({
                success: false,
                message: 'No active rate configured for this vehicle type'
            });
        }

        const exitTime = new Date();
        const durationMinutes = Math.ceil((exitTime - ticket.entryTime) / (1000 * 60));

        let amount = calculateAmount(durationMinutes, rate, ticket.status === 'lost');

        res.json({
            success: true,
            data: {
                ticket: {
                    id: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    plateNumber: ticket.plateNumber,
                    vehicleType: ticket.vehicleType,
                    entryTime: ticket.entryTime,
                    status: ticket.status
                },
                calculation: {
                    exitTime,
                    durationMinutes,
                    formattedDuration: formatDuration(durationMinutes),
                    ratePerHour: rate.ratePerHour,
                    gracePeriodMinutes: rate.gracePeriodMinutes,
                    dailyMax: rate.dailyMax,
                    isLostTicket: ticket.status === 'lost',
                    lostTicketFee: ticket.status === 'lost' ? rate.lostTicketFee : null,
                    amount,
                    formattedAmount: `Rp. ${amount.toLocaleString('id-ID')}`
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Process payment
const processPayment = async (req, res, next) => {
    try {
        const { ticketId, paymentMethod, amountPaid, discountCode, notes } = req.body;

        const ticket = await Ticket.findByPk(ticketId, {
            include: [{ model: Payment, as: 'payment' }]
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        if (ticket.payment) {
            return res.status(400).json({
                success: false,
                message: 'Ticket already paid'
            });
        }

        if (ticket.status !== 'active' && ticket.status !== 'lost') {
            return res.status(400).json({
                success: false,
                message: 'Ticket cannot be processed'
            });
        }

        // Get rate and calculate
        const rate = await Rate.getActiveRate(ticket.vehicleType);

        if (!rate) {
            return res.status(500).json({
                success: false,
                message: 'No active rate found'
            });
        }

        const exitTime = new Date();
        const durationMinutes = Math.ceil((exitTime - ticket.entryTime) / (1000 * 60));
        let amount = calculateAmount(durationMinutes, rate, ticket.status === 'lost');

        // Apply discount if valid
        let discountAmount = 0;
        if (discountCode) {
            // TODO: Implement discount code validation
            // For now, just log it
        }

        const finalAmount = amount - discountAmount;

        // Create payment record
        const payment = await Payment.create({
            ticketId: ticket.id,
            amount: finalAmount,
            paymentMethod,
            durationMinutes,
            rateApplied: rate.ratePerHour,
            discountAmount,
            discountCode,
            operatorId: req.userId || null,
            paidAt: new Date(),
            notes
        });

        // Update ticket
        await ticket.update({
            status: 'paid',
            exitTime
        });

        // Log activity
        await ActivityLog.log({
            userId: req.userId,
            action: 'PAYMENT_PROCESSED',
            entityType: 'payment',
            entityId: payment.id,
            details: {
                ticketNumber: ticket.ticketNumber,
                amount: finalAmount,
                paymentMethod,
                durationMinutes
            },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                payment: {
                    id: payment.id,
                    receiptNumber: payment.receiptNumber,
                    amount: payment.amount,
                    formattedAmount: `Rp. ${payment.amount.toLocaleString('id-ID')}`,
                    paymentMethod: payment.paymentMethod,
                    durationMinutes: payment.durationMinutes,
                    formattedDuration: formatDuration(durationMinutes),
                    paidAt: payment.paidAt
                },
                ticket: {
                    ticketNumber: ticket.ticketNumber,
                    plateNumber: ticket.plateNumber,
                    vehicleType: ticket.vehicleType,
                    entryTime: ticket.entryTime,
                    exitTime: ticket.exitTime,
                    status: ticket.status
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get payment by ID or receipt number
const getPayment = async (req, res, next) => {
    try {
        const { identifier } = req.params;

        let payment;

        if (/^\d+$/.test(identifier)) {
            payment = await Payment.findByPk(identifier, {
                include: [{ model: Ticket, as: 'ticket' }]
            });
        } else {
            payment = await Payment.findOne({
                where: { receiptNumber: identifier },
                include: [{ model: Ticket, as: 'ticket' }]
            });
        }

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            data: {
                payment: {
                    ...payment.toJSON(),
                    formattedAmount: `Rp. ${payment.amount.toLocaleString('id-ID')}`,
                    formattedDuration: formatDuration(payment.durationMinutes)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get payment history
const getPaymentHistory = async (req, res, next) => {
    try {
        const { fromDate, toDate, paymentMethod, page = 1, limit = 20 } = req.query;

        const where = {};

        if (fromDate) {
            where.paidAt = { ...where.paidAt, [require('sequelize').Op.gte]: new Date(fromDate) };
        }
        if (toDate) {
            where.paidAt = { ...where.paidAt, [require('sequelize').Op.lte]: new Date(toDate) };
        }
        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: payments } = await Payment.findAndCountAll({
            where,
            include: [{
                model: Ticket,
                as: 'ticket',
                attributes: ['ticketNumber', 'plateNumber', 'vehicleType']
            }],
            order: [['paidAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        // Calculate totals
        const totals = await Payment.findAll({
            where,
            attributes: [
                [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'totalAmount'],
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalCount']
            ],
            raw: true
        });

        res.json({
            success: true,
            data: {
                payments: payments.map(p => ({
                    ...p.toJSON(),
                    formattedAmount: `Rp. ${parseFloat(p.amount).toLocaleString('id-ID')}`,
                    formattedDuration: formatDuration(p.durationMinutes)
                })),
                summary: {
                    totalAmount: parseFloat(totals[0]?.totalAmount || 0),
                    formattedTotalAmount: `Rp. ${parseFloat(totals[0]?.totalAmount || 0).toLocaleString('id-ID')}`,
                    totalTransactions: parseInt(totals[0]?.totalCount || 0)
                },
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
};

// Helper: Calculate amount
function calculateAmount(durationMinutes, rate, isLostTicket) {
    if (isLostTicket && rate.lostTicketFee) {
        return parseFloat(rate.lostTicketFee);
    }

    const gracePeriod = rate.gracePeriodMinutes || 0;

    if (durationMinutes <= gracePeriod) {
        return 0;
    }

    const billableMinutes = durationMinutes - gracePeriod;
    const hours = Math.ceil(billableMinutes / 60);

    let amount = hours * parseFloat(rate.ratePerHour);

    if (rate.dailyMax && amount > parseFloat(rate.dailyMax)) {
        amount = parseFloat(rate.dailyMax);
    }

    return Math.round(amount);
}

// Helper: Format duration
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days} hari ${remainingHours} jam ${mins} menit`;
    }

    if (hours > 0) {
        return `${hours} jam ${mins} menit`;
    }

    return `${mins} menit`;
}

module.exports = {
    calculateFee,
    processPayment,
    getPayment,
    getPaymentHistory,
    processPaymentValidation
};
