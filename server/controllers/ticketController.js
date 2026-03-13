const { body } = require('express-validator');
const { Op } = require('sequelize');
const { Ticket, Payment, PlateCapture, Blacklist, MonthlyPass, ActivityLog, Rate, Setting } = require('../models');
const qrService = require('../services/qrService');

// Validation rules
const createTicketValidation = [
    body('plateNumber')
        .trim()
        .notEmpty().withMessage('Plate number is required')
        .isLength({ min: 2, max: 20 }).withMessage('Plate number must be 2-20 characters'),
    body('vehicleType')
        .isIn(['car', 'motorcycle', 'truck', 'suv']).withMessage('Invalid vehicle type'),
    body('parkingSpot')
        .optional().trim().isLength({ max: 20 })
];

// Create new ticket (entry)
const createTicket = async (req, res, next) => {
    try {
        const { plateNumber, vehicleType, parkingSpot, entryImagePath, notes } = req.body;

        const normalizedPlate = plateNumber.toUpperCase().replace(/\s+/g, '');

        // Check blacklist
        const blacklisted = await Blacklist.isBlacklisted(normalizedPlate);
        if (blacklisted) {
            return res.status(403).json({
                success: false,
                message: 'Vehicle is blacklisted',
                data: { reason: blacklisted.reason, severity: blacklisted.severity }
            });
        }

        // Check capacity
        const [maxCapacity, activeCount] = await Promise.all([
            Setting.get('max_capacity', 100),
            Ticket.count({ where: { status: 'active' } })
        ]);

        if (activeCount >= parseInt(maxCapacity)) {
            return res.status(409).json({
                success: false,
                message: `Parkir penuh. Kapasitas maksimum (${maxCapacity} kendaraan) telah tercapai.`,
                data: { maxCapacity: parseInt(maxCapacity), activeCount }
            });
        }

        // Check for monthly pass
        const monthlyPass = await MonthlyPass.findValidByPlate(normalizedPlate);

        // Check for existing active ticket with same plate
        const existingTicket = await Ticket.findOne({
            where: { plateNumber: normalizedPlate, status: 'active' }
        });

        if (existingTicket) {
            return res.status(409).json({
                success: false,
                message: 'Active ticket already exists for this plate',
                data: {
                    ticketNumber: existingTicket.ticketNumber,
                    entryTime: existingTicket.entryTime
                }
            });
        }

        // Create ticket
        const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;

        const qrCodeData = await qrService.generateTicketQR({
            ticketNumber,
            plateNumber: normalizedPlate,
            entryTime: new Date(),
            vehicleType
        });

        const ticket = await Ticket.create({
            ticketNumber,
            qrCodeData,
            plateNumber: normalizedPlate,
            vehicleType,
            parkingSpot,
            entryImagePath,
            notes,
            entryTime: new Date()
        });

        // Fetch parking identity for print
        const [parkingName, parkingAddress] = await Promise.all([
            Setting.get('parking_name', 'Smart Parking'),
            Setting.get('parking_address', '')
        ]);

        // Log activity
        await ActivityLog.log({
            userId: req.userId || null,
            action: 'TICKET_CREATED',
            entityType: 'ticket',
            entityId: ticket.id,
            details: {
                ticketNumber: ticket.ticketNumber,
                plateNumber: normalizedPlate,
                vehicleType,
                hasMonthlyPass: !!monthlyPass
            },
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: {
                ticket: {
                    id: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    plateNumber: ticket.plateNumber,
                    vehicleType: ticket.vehicleType,
                    entryTime: ticket.entryTime,
                    parkingSpot: ticket.parkingSpot,
                    qrCodeData: ticket.qrCodeData,
                    status: ticket.status
                },
                // Parking identity included so the client can use them for printing
                // without needing a separate authenticated settings request
                parkingName,
                parkingAddress,
                hasMonthlyPass: !!monthlyPass,
                monthlyPass: monthlyPass ? {
                    passNumber: monthlyPass.passNumber,
                    holderName: monthlyPass.holderName,
                    endDate: monthlyPass.endDate
                } : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get ticket by ID or ticket number
const getTicket = async (req, res, next) => {
    try {
        const { identifier } = req.params;

        let ticket;
        if (/^\d+$/.test(identifier)) {
            ticket = await Ticket.findByPk(identifier, {
                include: [
                    { model: Payment, as: 'payment' },
                    { model: PlateCapture, as: 'plateCaptures' }
                ]
            });
        } else {
            ticket = await Ticket.findOne({
                where: { ticketNumber: identifier },
                include: [
                    { model: Payment, as: 'payment' },
                    { model: PlateCapture, as: 'plateCaptures' }
                ]
            });
        }

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const rate = await Rate.getActiveRate(ticket.vehicleType);
        const duration = ticket.getDurationMinutes();
        let estimatedCost = 0;
        if (rate && ticket.status === 'active') estimatedCost = calculateCost(duration, rate);

        res.json({
            success: true,
            data: {
                ticket: {
                    ...ticket.toJSON(),
                    formattedDuration: ticket.getFormattedDuration(),
                    durationMinutes: duration
                },
                estimatedCost,
                rate: rate ? {
                    ratePerHour: rate.ratePerHour,
                    dailyMax: rate.dailyMax,
                    gracePeriodMinutes: rate.gracePeriodMinutes
                } : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// Search tickets
const searchTickets = async (req, res, next) => {
    try {
        const { plateNumber, ticketNumber, status, vehicleType, fromDate, toDate, page = 1, limit = 20 } = req.query;

        const where = {};
        if (plateNumber) where.plateNumber = { [Op.like]: `%${plateNumber.toUpperCase()}%` };
        if (ticketNumber) where.ticketNumber = { [Op.like]: `%${ticketNumber}%` };
        if (status) where.status = status;
        if (vehicleType) where.vehicleType = vehicleType;
        if (fromDate) where.entryTime = { ...where.entryTime, [Op.gte]: new Date(fromDate) };
        if (toDate) where.entryTime = { ...where.entryTime, [Op.lte]: new Date(toDate) };

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: tickets } = await Ticket.findAndCountAll({
            where,
            include: [{ model: Payment, as: 'payment' }],
            order: [['entryTime', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: {
                tickets: tickets.map(t => ({
                    ...t.toJSON(),
                    formattedDuration: t.getFormattedDuration(),
                    durationMinutes: t.getDurationMinutes()
                })),
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

// Get active tickets (Admin/Operator)
const getActiveTickets = async (req, res, next) => {
    try {
        const tickets = await Ticket.findAll({
            where: { status: 'active' },
            order: [['entryTime', 'DESC']],
            limit: 100,
            attributes: ['id', 'ticketNumber', 'plateNumber', 'vehicleType', 'entryTime', 'parkingSpot', 'qrCodeData', 'status']
        });

        const formattedTickets = tickets.map(t => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            plateNumber: t.plateNumber,
            vehicleType: t.vehicleType,
            entryTime: t.entryTime,
            parkingSpot: t.parkingSpot,
            qrCodeData: t.qrCodeData,
            formattedDuration: formatDuration(t.entryTime)
        }));

        res.json({
            success: true,
            data: { tickets: formattedTickets, total: tickets.length }
        });
    } catch (error) {
        next(error);
    }
};

// Get current user's tickets (Customer)
const getMyTickets = async (req, res, next) => {
    try {
        const tickets = await Ticket.findAll({
            where: { status: 'active', userId: req.userId },
            order: [['entryTime', 'DESC']],
            attributes: ['id', 'ticketNumber', 'plateNumber', 'vehicleType', 'entryTime', 'parkingSpot', 'qrCodeData']
        });

        res.json({
            success: true,
            data: {
                tickets: tickets.map(t => ({
                    id: t.id,
                    ticketNumber: t.ticketNumber,
                    plateNumber: t.plateNumber,
                    vehicleType: t.vehicleType,
                    entryTime: t.entryTime,
                    parkingSpot: t.parkingSpot,
                    qrCodeData: t.qrCodeData
                })),
                total: tickets.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// Print ticket (Reprint)
const printTicket = async (req, res, next) => {
    try {
        const { identifier } = req.params;

        let ticket;
        if (/^\d+$/.test(identifier)) {
            ticket = await Ticket.findByPk(identifier);
        } else {
            ticket = await Ticket.findOne({ where: { ticketNumber: identifier } });
        }

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Tiket tidak ditemukan' });
        }

        const [parkingName, parkingAddress] = await Promise.all([
            Setting.get('parking_name', 'Smart Parking'),
            Setting.get('parking_address', '')
        ]);

        await ActivityLog.create({
            userId: req.userId,
            action: 'TICKET_REPRINTED',
            entityType: 'ticket',
            entityId: ticket.id,
            details: { ticketNumber: ticket.ticketNumber, plateNumber: ticket.plateNumber },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Tiket siap dicetak',
            data: {
                id: ticket.id,
                ticketNumber: ticket.ticketNumber,
                plateNumber: ticket.plateNumber,
                vehicleType: ticket.vehicleType,
                entryTime: ticket.entryTime,
                parkingSpot: ticket.parkingSpot,
                qrCodeData: ticket.qrCodeData,
                formattedDuration: formatDuration(ticket.entryTime),
                parkingName,
                parkingAddress
            }
        });
    } catch (error) {
        next(error);
    }
};

function formatDuration(entryTime) {
    const minutes = Math.floor((Date.now() - new Date(entryTime).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// Mark ticket as lost
const markTicketLost = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const { verificationMethod, notes } = req.body;

        let ticket;
        if (/^\d+$/.test(identifier)) {
            ticket = await Ticket.findByPk(identifier);
        } else {
            ticket = await Ticket.findOne({ where: { plateNumber: identifier.toUpperCase(), status: 'active' } });
        }

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Active ticket not found' });
        }

        await ticket.update({
            status: 'lost',
            notes: `LOST TICKET - ${verificationMethod || 'Manual verification'}\n${notes || ''}`
        });

        await ActivityLog.log({
            userId: req.userId,
            action: 'TICKET_MARKED_LOST',
            entityType: 'ticket',
            entityId: ticket.id,
            details: { ticketNumber: ticket.ticketNumber, verificationMethod },
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'Ticket marked as lost', data: { ticket } });
    } catch (error) {
        next(error);
    }
};

// Cancel/delete ticket
const cancelTicket = async (req, res, next) => {
    try {
        const { id } = req.params;

        const ticket = await Ticket.findByPk(id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Tiket tidak ditemukan' });
        }

        await ActivityLog.create({
            userId: req.userId,
            action: 'TICKET_DELETED',
            entityType: 'ticket',
            entityId: ticket.id,
            details: {
                ticketNumber: ticket.ticketNumber,
                plateNumber: ticket.plateNumber,
                status: ticket.status,
                deletedReason: 'Manual deletion - lost ticket'
            },
            ipAddress: req.ip
        });

        await ticket.destroy();

        res.json({
            success: true,
            message: 'Tiket berhasil dihapus',
            data: { deletedTicketNumber: ticket.ticketNumber }
        });
    } catch (error) {
        next(error);
    }
};

function calculateCost(durationMinutes, rate) {
    const gracePeriod = rate.gracePeriodMinutes || 0;
    if (durationMinutes <= gracePeriod) return 0;
    const billableMinutes = durationMinutes - gracePeriod;
    const hours = Math.ceil(billableMinutes / 60);
    let cost = hours * parseFloat(rate.ratePerHour);
    if (rate.dailyMax && cost > parseFloat(rate.dailyMax)) cost = parseFloat(rate.dailyMax);
    return Math.round(cost);
}

module.exports = {
    createTicket,
    getTicket,
    searchTickets,
    getActiveTickets,
    getMyTickets,
    printTicket,
    markTicketLost,
    cancelTicket,
    createTicketValidation,
    calculateCost
};