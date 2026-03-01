import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Navbar from '../components/common/Navbar';

export default function TestTicket() {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [printing, setPrinting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchActiveTickets();
        // Refresh every 30 seconds
        const interval = setInterval(fetchActiveTickets, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchActiveTickets = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/tickets/active', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tickets');
            }

            const data = await response.json();
            setTickets(data.data || []);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTicket = (ticket) => {
        setSelectedTicket(ticket);
    };

    const getDuration = (entryTime) => {
        const minutes = Math.floor((Date.now() - new Date(entryTime).getTime()) / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const handlePrintTicket = async () => {
        if (!selectedTicket) return;
        try {
            setPrinting(true);
            const response = await fetch(`/api/tickets/${selectedTicket.id}/print`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to prepare ticket for printing');
            }

            const result = await response.json();
            
            // Update selected ticket with fresh data
            setSelectedTicket(result.data);
            
            // Trigger browser print dialog
            setTimeout(() => {
                window.print();
            }, 100);
        } catch (err) {
            alert('Error printing ticket: ' + err.message);
        } finally {
            setPrinting(false);
        }
    };

    const handleRefresh = () => {
        fetchActiveTickets();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-6xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30 mb-4">
                        <i className="fas fa-ticket text-white text-2xl"></i>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Active Tickets</h1>
                    <p className="text-gray-600 mt-2">View and manage active parking tickets - Admin only</p>
                </div>

                {/* Refresh Button */}
                <div className="flex justify-end mb-6">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                    >
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        Refresh
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block">
                            <i className="fas fa-spinner fa-spin text-4xl text-purple-600"></i>
                        </div>
                        <p className="text-gray-600 mt-4">Loading active tickets...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
                        <p className="text-red-700">
                            <i className="fas fa-exclamation-circle mr-2"></i>
                            Error: {error}
                        </p>
                        <button
                            onClick={handleRefresh}
                            className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && tickets.length === 0 && (
                    <div className="text-center py-12">
                        <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                        <p className="text-gray-500 text-lg">No active tickets found</p>
                    </div>
                )}

                {/* Tickets Grid */}
                {!loading && tickets.length > 0 && (
                    <div className="grid md:grid-cols-3 gap-6 mb-10">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => handleSelectTicket(ticket)}
                                className={`glass-card rounded-xl p-6 cursor-pointer transition-all ${
                                    selectedTicket?.id === ticket.id
                                        ? 'ring-2 ring-purple-500 scale-105 shadow-xl'
                                        : 'hover:shadow-lg'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-gray-500 text-sm">Ticket Number</p>
                                        <p className="font-bold text-sm">{ticket.ticketNumber}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        ticket.vehicleType === 'car' ? 'bg-blue-100 text-blue-700' :
                                        ticket.vehicleType === 'motorcycle' ? 'bg-orange-100 text-orange-700' :
                                        ticket.vehicleType === 'truck' ? 'bg-red-100 text-red-700' :
                                        ticket.vehicleType === 'suv' ? 'bg-green-100 text-green-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {ticket.vehicleType}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm mb-4">
                                    <div>
                                        <p className="text-gray-500">Plate Number</p>
                                        <p className="font-bold text-lg">{ticket.plateNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Duration</p>
                                        <p className="font-bold text-green-600">{getDuration(ticket.entryTime)}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <p className="text-xs text-gray-500">Entry Time</p>
                                    <p className="text-sm font-medium">
                                        {new Date(ticket.entryTime).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Ticket Details */}
                {selectedTicket && (
                    <div className="max-w-2xl mx-auto animate-fade-in">
                        <div className="glass-card rounded-3xl overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white text-center">
                                <h2 className="text-2xl font-bold">{selectedTicket.ticketNumber}</h2>
                                <p className="text-purple-100 text-sm mt-1">Click to close detail</p>
                            </div>

                            {/* Content */}
                            <div className="p-8">
                                {/* QR Code */}
                                <div className="flex justify-center mb-8">
                                    <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-md">
                                        {selectedTicket.qrCodeData ? (
                                            <QRCode
                                                value={selectedTicket.qrCodeData}
                                                size={200}
                                                level="M"
                                                includeMargin={true}
                                            />
                                        ) : (
                                            <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                                                <p>QR Code unavailable</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between py-3 border-b">
                                        <span className="text-gray-500">Plate Number</span>
                                        <span className="font-bold">{selectedTicket.plateNumber}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b">
                                        <span className="text-gray-500">Vehicle Type</span>
                                        <span className="font-bold capitalize">{selectedTicket.vehicleType}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b">
                                        <span className="text-gray-500">Entry Time</span>
                                        <span className="font-bold">
                                            {new Date(selectedTicket.entryTime).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-3">
                                        <span className="text-gray-500">Duration</span>
                                        <span className="font-bold text-green-600">
                                            {getDuration(selectedTicket.entryTime)}
                                        </span>
                                    </div>
                                    {selectedTicket.parkingSpot && (
                                        <div className="flex justify-between py-3 border-t">
                                            <span className="text-gray-500">Parking Spot</span>
                                            <span className="font-bold">{selectedTicket.parkingSpot}</span>
                                        </div>
                                    )}
                                </div>

                                {/* QR Data */}
                                <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-500 mb-2">QR Code Data</p>
                                    <p className="text-xs font-mono break-all text-gray-700 max-h-24 overflow-y-auto">
                                        {selectedTicket.qrCodeData || 'N/A'}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handlePrintTicket}
                                        disabled={printing}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                                    >
                                        <i className={`fas fa-print ${printing ? 'fa-spin' : ''}`}></i>
                                        {printing ? 'Preparing...' : 'Print Ticket'}
                                    </button>
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                    >
                                        <i className="fas fa-times"></i>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}