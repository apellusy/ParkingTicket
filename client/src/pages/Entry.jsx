import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Webcam from 'react-webcam';
import Navbar from '../components/common/Navbar';
import { ticketService } from '../services/api';
import { showSuccess, showError, showLoading, closeLoading } from '../utils/alerts';

const Entry = () => {
    const [step, setStep] = useState(1); // 1: Form, 2: Camera, 3: Ticket
    const [formData, setFormData] = useState({
        plateNumber: '',
        vehicleType: 'car'
    });
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const webcamRef = useRef(null);

    const vehicleTypes = [
        { value: 'motorcycle', label: 'Sepeda Motor', icon: 'fa-motorcycle' },
        { value: 'car', label: 'Mobil', icon: 'fa-car' },
        { value: 'suv', label: 'SUV', icon: 'fa-car-side' },
        { value: 'truck', label: 'Truk', icon: 'fa-truck' }
    ];

    const handleCapture = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            // In a real app, send to LPR service
            console.log('Captured image for LPR');
            setShowCamera(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.plateNumber.trim()) {
            showError('Plat nomor harus diisi');
            return;
        }

        setLoading(true);
        showLoading('Membuat tiket...');

        try {
            const response = await ticketService.create({
                plateNumber: formData.plateNumber.toUpperCase(),
                vehicleType: formData.vehicleType
            });

            closeLoading();

            if (response.data.success) {
                setTicket(response.data.data.ticket);
                setStep(3);
                showSuccess('Tiket berhasil dibuat!');
            } else {
                showError(response.data.message);
            }
        } catch (error) {
            closeLoading();
            console.error('Full error response:', error.response?.data); // Log everything
            console.error('Errors array:', error.response?.data?.errors); // Add this
            const message = error.response?.data?.message || 'Gagal membuat tiket';
            showError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleNewTicket = () => {
        setFormData({ plateNumber: '', vehicleType: 'car' });
        setTicket(null);
        setStep(1);
    };

const handlePrint = () => {
    if (!ticket) return;

    const printWindow = window.open('', '', 'width=80mm,height=120mm');
    const parkingName = 'Smart Parking';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Parking Ticket</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: Arial, sans-serif; 
                width: 80mm; 
                margin: 0; 
                padding: 0;
            }
            .page { 
                width: 80mm; 
                height: 120mm; 
                padding: 8mm;
                display: flex;
                flex-direction: column;
            }
            .header { 
                font-size: 12px; 
                font-weight: bold; 
                text-align: center; 
                margin-bottom: 3mm;
            }
            .title {
                font-size: 10px;
                text-align: center;
                margin-bottom: 4mm;
            }
            .qr-section { 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                margin-bottom: 6mm;
                flex-shrink: 0;
            }
            .qr-code { 
                width: 50mm;
                height: 50mm;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #000;
            }
            .ticket-no { 
                font-size: 14px; 
                font-weight: bold; 
                margin-top: 3mm; 
                text-align: center; 
                letter-spacing: 1px;
            }
            .scan-text {
                font-size: 8px;
                text-align: center;
                margin-top: 1mm;
            }
            .info-section { 
                font-size: 9px;
                flex-grow: 1;
            }
            .info-row { 
                display: flex;
                justify-content: space-between;
                margin: 2mm 0;
                padding: 1mm 0;
            }
            .label { 
                font-weight: bold; 
                width: 35%;
            }
            .value { 
                width: 65%;
                text-align: right;
            }
            .divider { 
                border-bottom: 1px dashed #000; 
                margin: 2mm 0;
            }
            .footer { 
                font-size: 7px; 
                text-align: center; 
                margin-top: 3mm;
                color: #666;
            }
            @media print {
                body { margin: 0; padding: 0; }
                .page { margin: 0; }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">${parkingName}</div>
            <div class="title">PARKING TICKET</div>
            
            <div class="qr-section">
                <div class="qr-code">
                    <img src="data:image/svg+xml;base64,${btoa(ticket.qrCodeData)}" style="width: 48mm; height: 48mm;" alt="QR" />
                </div>
                <div class="ticket-no">${ticket.ticketNumber}</div>
                <div class="scan-text">Scan or Present at Exit</div>
            </div>

            <div class="info-section">
                <div class="divider"></div>
                <div class="info-row">
                    <span class="label">Plate:</span>
                    <span class="value">${ticket.plateNumber}</span>
                </div>
                <div class="info-row">
                    <span class="label">Vehicle:</span>
                    <span class="value">${ticket.vehicleType}</span>
                </div>
                <div class="info-row">
                    <span class="label">Entry:</span>
                    <span class="value">${new Date(ticket.entryTime).toLocaleTimeString('id-ID')}</span>
                </div>
                <div class="divider"></div>
            </div>

            <div class="footer">Keep this ticket safe</div>
        </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
};

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 mb-4">
                        <i className="fas fa-arrow-right-to-bracket text-white text-2xl"></i>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Masuk Parkir</h1>
                    <p className="text-gray-600 mt-2">Buat tiket parkir baru untuk kendaraan Anda</p>
                </div>

                {/* Step 1: Form */}
                {step === 1 && (
                    <div className="glass-card rounded-3xl p-8 max-w-lg mx-auto animate-fade-in">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Plate Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Plat Nomor Kendaraan
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.plateNumber}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            plateNumber: e.target.value.toUpperCase()
                                        })}
                                        className="input-field text-center text-2xl font-bold tracking-widest"
                                        placeholder="B 1234 XYZ"
                                        maxLength={15}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCamera(true)}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                                >
                                    <i className="fas fa-camera mr-1"></i>
                                    Ambil foto plat
                                </button>
                            </div>

                            {/* Vehicle Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Jenis Kendaraan
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {vehicleTypes.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vehicleType: type.value })}
                                            className={`p-4 rounded-xl border-2 transition-all ${formData.vehicleType === type.value
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <i className={`fas ${type.icon} text-2xl mb-2`}></i>
                                            <p className="text-sm font-medium">{type.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-4 text-lg"
                            >
                                {loading ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i>Memproses...</>
                                ) : (
                                    <><i className="fas fa-ticket mr-2"></i>Buat Tiket</>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step 3: Ticket Result */}
                {step === 3 && ticket && (
                    <div className="max-w-md mx-auto animate-fade-in">
                        {/* Ticket Card */}
                        <div className="glass-card rounded-3xl overflow-hidden print-area">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <i className="fas fa-parking"></i>
                                    <span className="font-semibold">Smart Parking</span>
                                </div>
                                <h2 className="text-2xl font-bold">TIKET PARKIR</h2>
                            </div>

                            {/* QR Code */}
                            <div className="p-8 text-center bg-white">
                                <div className="qr-container inline-block mb-6">
                                    <QRCode
                                        value={ticket.qrCodeData || ticket.ticketNumber}
                                        size={200}
                                        level="M"
                                    />
                                </div>

                                {/* Ticket Details */}
                                <div className="space-y-4 text-left">
                                    <div className="flex justify-between py-3 border-b border-dashed">
                                        <span className="text-gray-500">No. Tiket</span>
                                        <span className="font-bold text-gray-900">{ticket.ticketNumber}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-dashed">
                                        <span className="text-gray-500">Plat Nomor</span>
                                        <span className="font-bold text-gray-900">{ticket.plateNumber}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-dashed">
                                        <span className="text-gray-500">Jenis Kendaraan</span>
                                        <span className="font-bold text-gray-900 capitalize">{ticket.vehicleType}</span>
                                    </div>
                                    <div className="flex justify-between py-3">
                                        <span className="text-gray-500">Waktu Masuk</span>
                                        <span className="font-bold text-gray-900">
                                            {new Date(ticket.entryTime).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 p-4 text-center text-sm text-gray-500">
                                <p>Simpan tiket ini untuk keluar parkir</p>
                                <p className="font-medium text-gray-700 mt-1">Terima kasih!</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 mt-6 no-print">
                            <button
                                onClick={handlePrint}
                                className="btn-primary flex-1"
                            >
                                <i className="fas fa-print mr-2"></i>
                                Cetak Tiket
                            </button>
                            <button
                                onClick={handleNewTicket}
                                className="btn-outline flex-1"
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Tiket Baru
                            </button>
                        </div>
                    </div>
                )}

                {/* Camera Modal */}
                {showCamera && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h3 className="font-semibold">Ambil Foto Plat Nomor</h3>
                                <button onClick={() => setShowCamera(false)}>
                                    <i className="fas fa-times text-gray-500"></i>
                                </button>
                            </div>
                            <div className="aspect-video bg-black">
                                <Webcam
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{
                                        facingMode: 'environment'
                                    }}
                                />
                            </div>
                            <div className="p-4 flex gap-3">
                                <button
                                    onClick={() => setShowCamera(false)}
                                    className="btn-outline flex-1"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleCapture}
                                    className="btn-primary flex-1"
                                >
                                    <i className="fas fa-camera mr-2"></i>
                                    Ambil Foto
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Back Link */}
                <div className="text-center mt-8 no-print">
                    <Link to="/" className="text-gray-600 hover:text-gray-900">
                        <i className="fas fa-arrow-left mr-2"></i>
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Entry;
