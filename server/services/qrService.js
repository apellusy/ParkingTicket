const QRCode = require('qrcode');
const crypto = require('crypto');

const QR_SECRET = process.env.QR_SECRET || 'parking_qr_secret_key';

const generateTicketQR = async (ticket) => {
    try {
        const payload = {
            t: ticket.ticketNumber,
            p: ticket.plateNumber,
            e: ticket.entryTime.toISOString(),
            v: ticket.vehicleType,
            ts: Date.now()
        };

        const payloadString = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', QR_SECRET)
            .update(payloadString)
            .digest('hex')
            .substring(0, 16);

        // Return simple string, NOT base64 image
        const qrData = JSON.stringify({
            ...payload,
            sig: signature
        });

        return qrData; // Just return the string, not base64 image
    } catch (error) {
        console.error('QR generation error:', error);
        throw new Error('Failed to generate QR code');
    }
};

const verifyTicketQR = (qrData) => {
    try {
        const data = JSON.parse(qrData);
        const { sig, ...payload } = data;
        
        const payloadString = JSON.stringify(payload);
        const expectedSig = crypto
            .createHmac('sha256', QR_SECRET)
            .update(payloadString)
            .digest('hex')
            .substring(0, 16);

        if (sig !== expectedSig) {
            return null;
        }

        return data;
    } catch (error) {
        return null;
    }
};

const generatePassQR = async (pass) => {
    try {
        const payload = {
            pn: pass.passNumber,
            pl: pass.plateNumber,
            ed: pass.endDate.toISOString(),
            ts: Date.now()
        };

        const payloadString = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', QR_SECRET)
            .update(payloadString)
            .digest('hex')
            .substring(0, 16);

        return JSON.stringify({
            ...payload,
            sig: signature
        });
    } catch (error) {
        console.error('QR generation error:', error);
        throw new Error('Failed to generate QR code');
    }
};

module.exports = {
    generateTicketQR,
    verifyTicketQR,
    generatePassQR
};