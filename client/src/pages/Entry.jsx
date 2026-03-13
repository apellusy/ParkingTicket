import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Webcam from 'react-webcam';
import Navbar from '../components/common/Navbar';
import { ticketService } from '../services/api';
import { showSuccess, showError, showLoading, closeLoading } from '../utils/alerts';

const Entry = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ plateNumber: '', vehicleType: 'car' });
    const [ticket, setTicket] = useState(null);
    const [parkingInfo, setParkingInfo] = useState({ name: 'Smart Parking', address: '' });
    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const webcamRef = useRef(null);

    const vehicleTypes = [
        { value: 'motorcycle', label: 'Sepeda Motor', icon: 'fa-motorcycle' },
        { value: 'car',        label: 'Mobil',        icon: 'fa-car' },
        { value: 'suv',        label: 'SUV',          icon: 'fa-car-side' },
        { value: 'truck',      label: 'Truk',         icon: 'fa-truck' }
    ];

    const handleCapture = () => {
        if (webcamRef.current) {
            webcamRef.current.getScreenshot();
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
                // Store parking identity returned by the server so the
                // print function always uses the current settings values.
                setParkingInfo({
                    name: response.data.data.parkingName || 'Smart Parking',
                    address: response.data.data.parkingAddress || ''
                });
                setStep(3);
                showSuccess('Tiket berhasil dibuat!');
            } else {
                showError(response.data.message);
            }
        } catch (error) {
            closeLoading();
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
        const vehicleLabels = { car: 'Mobil', motorcycle: 'Sepeda Motor', suv: 'SUV', truck: 'Truk' };
        const vehicleLabel = vehicleLabels[ticket.vehicleType] || ticket.vehicleType;
        const entryDate = new Date(ticket.entryTime);
        const formattedTime = entryDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const formattedDate = entryDate.toLocaleDateString('id-ID', {
            weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit'
        });
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qrCodeData)}`;

        const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"><title>Tiket Parkir - ${ticket.ticketNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}html,body{width:80mm}
    body{font-family:'Courier New',monospace;background:#f5f5f5}
    @media print{body{background:white;margin:0}.page{margin:0;box-shadow:none}}
    .page{width:80mm;padding:5mm;background:white;box-shadow:0 0 10px rgba(0,0,0,.1);margin:0 auto}
    .header{font-size:13px;font-weight:bold;text-align:center;margin-bottom:0.5mm;color:#1a1a1a}
    .address{font-size:7.5px;text-align:center;color:#555;margin-bottom:1mm}
    .title{font-size:10px;text-align:center;font-weight:bold;border-bottom:1.5px solid #000;padding-bottom:1.5mm;margin-bottom:3mm;letter-spacing:1px}
    .qr-section{display:flex;flex-direction:column;align-items:center;margin-bottom:4mm;background:#fafafa;padding:3mm}
    .qr-code{width:45mm;height:45mm;border:2px solid #333;display:flex;align-items:center;justify-content:center;background:white;margin-bottom:2mm;padding:1mm}
    .qr-code img{width:100%;height:100%;display:block}
    .ticket-no{font-size:14px;font-weight:bold;text-align:center;letter-spacing:2px;margin-bottom:1.5mm}
    .scan-text{font-size:7.5px;text-align:center;color:#555;font-style:italic}
    .divider{border-bottom:1px solid #999;margin:2.5mm 0}
    .divider-dashed{border-bottom:1px dashed #999;margin:2mm 0}
    .info-section{font-size:8.5px;line-height:1.4;color:#333}
    .info-row{display:flex;justify-content:space-between;margin:1.5mm 0;padding:.5mm 0;border-bottom:.5px solid #ddd}
    .label{font-weight:bold;width:40%;color:#444}.value{width:60%;text-align:right;font-weight:500}
    .note{font-size:7px;text-align:center;color:#e74c3c;margin-top:2mm;font-weight:bold;padding:1mm;background:#ffebeb}
  </style>
</head><body><div class="page">
  <div class="header">${parkingInfo.name}</div>
  ${parkingInfo.address ? `<div class="address">${parkingInfo.address}</div>` : ''}
  <div class="title">TIKET PARKIR</div>
  <div class="qr-section">
    <div class="qr-code"><img src="${qrUrl}" alt="QR"/></div>
    <div class="ticket-no">${ticket.ticketNumber}</div>
    <div class="scan-text">Pindai atau tunjukkan saat keluar</div>
  </div>
  <div class="divider"></div>
  <div class="info-section">
    <div class="info-row"><span class="label">Plat:</span><span class="value">${ticket.plateNumber}</span></div>
    <div class="info-row"><span class="label">Jenis:</span><span class="value">${vehicleLabel}</span></div>
    <div class="info-row"><span class="label">Masuk:</span><span class="value">${formattedTime}</span></div>
    <div class="info-row"><span class="label">Tgl:</span><span class="value">${formattedDate}</span></div>
  </div>
  <div class="divider-dashed"></div>
  <div class="note">Hilang = Dikenakan Biaya Tambahan</div>
</div></body></html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 250);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-12">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Plat Nomor Kendaraan
                                </label>
                                <input
                                    type="text"
                                    value={formData.plateNumber}
                                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                                    className="input-field text-center text-2xl font-bold tracking-widest"
                                    placeholder="B 1234 XYZ"
                                    maxLength={15}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCamera(true)}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                                >
                                    <i className="fas fa-camera mr-1"></i>Ambil foto plat
                                </button>
                            </div>

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
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                                formData.vehicleType === type.value
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

                            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
                                {loading
                                    ? <><i className="fas fa-spinner fa-spin mr-2"></i>Memproses...</>
                                    : <><i className="fas fa-ticket mr-2"></i>Buat Tiket</>}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step 3: Ticket Result */}
                {step === 3 && ticket && (
                    <div className="max-w-md mx-auto animate-fade-in">
                        <div className="glass-card rounded-3xl overflow-hidden print-area">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <i className="fas fa-parking"></i>
                                    <span className="font-semibold">{parkingInfo.name}</span>
                                </div>
                                {parkingInfo.address && (
                                    <p className="text-blue-200 text-xs mb-2">{parkingInfo.address}</p>
                                )}
                                <h2 className="text-2xl font-bold">TIKET PARKIR</h2>
                            </div>

                            {/* QR Code */}
                            <div className="p-8 text-center bg-white">
                                <div className="qr-container inline-block mb-6">
                                    <QRCode value={ticket.qrCodeData || ticket.ticketNumber} size={200} level="M" />
                                </div>

                                <div className="space-y-4 text-left">
                                    {[
                                        ['No. Tiket', ticket.ticketNumber],
                                        ['Plat Nomor', ticket.plateNumber],
                                        ['Jenis Kendaraan', { car: 'Mobil', motorcycle: 'Sepeda Motor', suv: 'SUV', truck: 'Truk' }[ticket.vehicleType] || ticket.vehicleType],
                                        ['Waktu Masuk', new Date(ticket.entryTime).toLocaleString('id-ID')],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex justify-between py-3 border-b border-dashed last:border-0">
                                            <span className="text-gray-500">{label}</span>
                                            <span className="font-bold text-gray-900">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 text-center text-sm text-gray-500">
                                <p>Simpan tiket ini untuk keluar parkir</p>
                                <p className="font-medium text-gray-700 mt-1">Terima kasih!</p>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6 no-print">
                            <button onClick={handlePrint} className="btn-primary flex-1">
                                <i className="fas fa-print mr-2"></i>Cetak Tiket
                            </button>
                            <button onClick={handleNewTicket} className="btn-outline flex-1">
                                <i className="fas fa-plus mr-2"></i>Tiket Baru
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
                                    videoConstraints={{ facingMode: 'environment' }}
                                />
                            </div>
                            <div className="p-4 flex gap-3">
                                <button onClick={() => setShowCamera(false)} className="btn-outline flex-1">Batal</button>
                                <button onClick={handleCapture} className="btn-primary flex-1">
                                    <i className="fas fa-camera mr-2"></i>Ambil Foto
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="text-center mt-8 no-print">
                    <Link to="/" className="text-gray-600 hover:text-gray-900">
                        <i className="fas fa-arrow-left mr-2"></i>Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Entry;