import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Navbar from '../components/common/Navbar';
import { ticketService } from '../services/api';
import { showError } from '../utils/alerts';

const CustomerTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMyTickets();
        const interval = setInterval(fetchMyTickets, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchMyTickets = async () => {
        try {
            setLoading(true);
            const response = await ticketService.getMyTickets();
            
            if (response.data.success) {
                setTickets(response.data.data.tickets || []);
                setError(null);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat tiket Anda');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDuration = (entryTime) => {
        const minutes = Math.floor((Date.now() - new Date(entryTime).getTime()) / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getVehicleIcon = (type) => {
        const icons = {
            motorcycle: 'fa-motorcycle',
            car: 'fa-car',
            suv: 'fa-car-side',
            truck: 'fa-truck'
        };
        return icons[type] || 'fa-car';
    };

    const getVehicleColor = (type) => {
        const colors = {
            motorcycle: 'text-orange-600',
            car: 'text-blue-600',
            suv: 'text-green-600',
            truck: 'text-red-600'
        };
        return colors[type] || 'text-gray-600';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-6xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 shadow-lg shadow-green-500/30 mb-4">
                        <i className="fas fa-ticket text-white text-2xl"></i>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Tiket Parkir Saya</h1>
                    <p className="text-gray-600 mt-2">Lihat tiket parkir aktif Anda</p>
                </div>

                {/* Refresh Button */}
                <div className="flex justify-center mb-6">
                    <button
                        onClick={fetchMyTickets}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                    >
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        Refresh
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-16">
                        <div className="inline-block">
                            <i className="fas fa-spinner fa-spin text-5xl text-green-600 mb-4"></i>
                        </div>
                        <p className="text-gray-600 text-lg">Memuat tiket Anda...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg max-w-lg mx-auto">
                        <div className="flex items-start gap-4">
                            <i className="fas fa-exclamation-circle text-red-600 text-2xl mt-1"></i>
                            <div>
                                <p className="text-red-700 font-semibold">Error</p>
                                <p className="text-red-600 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && tickets.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl max-w-lg mx-auto">
                        <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                        <p className="text-gray-500 text-lg mb-4">Tidak ada tiket aktif</p>
                        <p className="text-gray-400 mb-6">Anda belum memiliki tiket parkir aktif saat ini</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <i className="fas fa-home mr-2"></i>Kembali ke Beranda
                        </button>
                    </div>
                )}

                {/* Tickets Grid */}
                {!loading && tickets.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={`transform transition-all cursor-pointer ${
                                    selectedTicket?.id === ticket.id
                                        ? 'ring-2 ring-green-500 scale-105'
                                        : 'hover:shadow-lg hover:scale-102'
                                } glass-card rounded-2xl p-6`}
                            >
                                {/* Top Section */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-gray-500 text-sm mb-1">No. Tiket</p>
                                        <p className="font-mono font-bold text-lg text-green-600">{ticket.ticketNumber}</p>
                                    </div>
                                    <i className={`fas ${getVehicleIcon(ticket.vehicleType)} text-4xl ${getVehicleColor(ticket.vehicleType)}`}></i>
                                </div>

                                {/* Details Section */}
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-gray-500 text-sm mb-1">Plat Nomor</p>
                                        <p className="font-bold text-xl text-gray-900">{ticket.plateNumber}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Jenis Kendaraan</p>
                                            <p className="font-semibold text-gray-700 capitalize">{ticket.vehicleType}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Durasi</p>
                                            <p className="font-semibold text-green-600">{getDuration(ticket.entryTime)}</p>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-200">
                                        <p className="text-gray-500 text-xs mb-1">Waktu Masuk</p>
                                        <p className="text-sm text-gray-700">
                                            {new Date(ticket.entryTime).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>

                                {/* Click Indicator */}
                                <p className="text-center text-xs text-gray-400 mt-4">
                                    Klik untuk lihat detail lengkap
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Ticket Details Modal */}
                {selectedTicket && (
                    <div className="max-w-2xl mx-auto">
                        <div className="glass-card rounded-3xl overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-white text-center">
                                <h2 className="text-3xl font-bold">{selectedTicket.ticketNumber}</h2>
                                <p className="text-green-100 text-sm mt-2">Tiket Parkir Aktif</p>
                            </div>

                            {/* Content */}
                            <div className="p-8">
                                {/* QR Code */}
                                <div className="flex justify-center mb-10">
                                    <div className="p-6 bg-gray-50 border-3 border-gray-200 rounded-2xl">
                                        {selectedTicket.qrCodeData ? (
                                            <QRCode
                                                value={selectedTicket.qrCodeData}
                                                size={220}
                                                level="M"
                                                includeMargin={true}
                                            />
                                        ) : (
                                            <div className="w-56 h-56 flex items-center justify-center text-gray-400 text-lg">
                                                QR Code tidak tersedia
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Vehicle Info */}
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-500 text-sm mb-1">Kendaraan Anda</p>
                                            <p className="text-2xl font-bold text-gray-900">{selectedTicket.plateNumber}</p>
                                        </div>
                                        <i className={`fas ${getVehicleIcon(selectedTicket.vehicleType)} text-5xl ${getVehicleColor(selectedTicket.vehicleType)}`}></i>
                                    </div>
                                    <p className="text-gray-600 mt-3 capitalize">
                                        Tipe Kendaraan: <span className="font-semibold">{selectedTicket.vehicleType}</span>
                                    </p>
                                </div>

                                {/* Details */}
                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between items-center py-4 px-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600">Waktu Masuk</span>
                                        <span className="font-semibold text-gray-900">
                                            {new Date(selectedTicket.entryTime).toLocaleString('id-ID', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 px-4 bg-green-50 rounded-lg">
                                        <span className="text-gray-600">Durasi Parkir</span>
                                        <span className="font-bold text-green-600 text-lg">
                                            {getDuration(selectedTicket.entryTime)}
                                        </span>
                                    </div>
                                    {selectedTicket.parkingSpot && (
                                        <div className="flex justify-between items-center py-4 px-4 bg-gray-50 rounded-lg">
                                            <span className="text-gray-600">Slot Parkir</span>
                                            <span className="font-semibold text-gray-900">{selectedTicket.parkingSpot}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Info Box */}
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-8">
                                    <p className="text-sm text-blue-800">
                                        <i className="fas fa-info-circle mr-2"></i>
                                        <strong>Ingat:</strong> Simpan tiket ini dengan baik atau simpan nomor tiket untuk keluar dari area parkir.
                                    </p>
                                </div>

                                {/* QR Data */}
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-8">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">DATA QR CODE</p>
                                    <p className="text-xs font-mono break-all text-gray-600 max-h-24 overflow-y-auto bg-white p-2 rounded">
                                        {selectedTicket.qrCodeData}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                                    >
                                        <i className="fas fa-times mr-2"></i>
                                        Tutup
                                    </button>
                                    <button
                                        onClick={() => navigate('/exit')}
                                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                    >
                                        <i className="fas fa-sign-out-alt mr-2"></i>
                                        Keluar Parkir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Back Link */}
                {!selectedTicket && (
                    <div className="text-center mt-8">
                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <i className="fas fa-arrow-left mr-2"></i>
                            Kembali ke Beranda
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerTickets;