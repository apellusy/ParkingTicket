import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Navbar from '../components/common/Navbar';
import { paymentService } from '../services/api';
import { showSuccess, showError, showLoading, closeLoading, showConfirm } from '../utils/alerts';

const Exit = () => {
    const [step, setStep] = useState(1); // 1: Search/Scan, 2: Payment, 3: Receipt
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('ticketNumber'); // ticketNumber, plateNumber, qrcode
    const [ticket, setTicket] = useState(null);
    const [calculation, setCalculation] = useState(null);
    const [payment, setPayment] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        if (showScanner) {
            const scanner = new Html5QrcodeScanner(
                'qr-scanner-exit',
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );
            scanner.render(
                (decodedText) => {
                    setSearchQuery(decodedText);
                    setSearchType('qrcode');
                    handleSearchWithQR(decodedText);
                    scanner.clear();
                    setShowScanner(false);
                },
                () => {}
            );
            return () => scanner.clear();
        }
    }, [showScanner]);

    const handleSearchWithQR = async (qrData) => {
        setLoading(true);
        showLoading('Membaca tiket...');

        try {
            const params = { qrCode: qrData };
            const response = await paymentService.calculate(params);
            closeLoading();

            if (response.data.success) {
                setTicket(response.data.data.ticket);
                setCalculation(response.data.data.calculation);
                setStep(2);
            } else {
                showError(response.data.message);
            }
        } catch (error) {
            closeLoading();
            showError(error.response?.data?.message || 'Tiket tidak valid');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
            showError('Masukkan nomor tiket, plat nomor, atau scan QR');
            return;
        }

        setLoading(true);
        showLoading('Mencari tiket...');

        try {
            const params = searchType === 'ticketNumber'
                ? { ticketNumber: searchQuery }
                : { plateNumber: searchQuery.toUpperCase() };

            const response = await paymentService.calculate(params);
            closeLoading();

            if (response.data.success) {
                setTicket(response.data.data.ticket);
                setCalculation(response.data.data.calculation);
                setStep(2);
            } else {
                showError(response.data.message);
            }
        } catch (error) {
            closeLoading();
            const message = error.response?.data?.message || 'Tiket tidak ditemukan';
            showError(message);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        const result = await showConfirm(
            `Total pembayaran: ${calculation.formattedAmount}`,
            'Konfirmasi Pembayaran',
            'Bayar',
            'Batal'
        );

        if (!result.isConfirmed) return;

        setLoading(true);
        showLoading('Memproses pembayaran...');

        try {
            const response = await paymentService.process({
                ticketId: ticket.id,
                paymentMethod,
                amountPaid: calculation.amount
            });

            closeLoading();

            if (response.data.success) {
                setPayment(response.data.data.payment);
                setStep(3);
                showSuccess('Pembayaran berhasil!');
            } else {
                showError(response.data.message);
            }
        } catch (error) {
            closeLoading();
            const message = error.response?.data?.message || 'Gagal memproses pembayaran';
            showError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleNewSearch = () => {
        setSearchQuery('');
        setTicket(null);
        setCalculation(null);
        setPayment(null);
        setSearchType('ticketNumber');
        setStep(1);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 shadow-lg shadow-green-500/30 mb-4">
                        <i className="fas fa-arrow-right-from-bracket text-white text-2xl"></i>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Keluar Parkir</h1>
                    <p className="text-gray-600 mt-2">Selesaikan pembayaran untuk keluar</p>
                </div>

                {/* Step 1: Search */}
                {step === 1 && (
                    <div className="glass-card rounded-3xl p-8 max-w-lg mx-auto animate-fade-in">
                        {/* QR Scanner Button */}
                        <button
                            type="button"
                            onClick={() => setShowScanner(!showScanner)}
                            className="w-full btn-primary mb-6"
                        >
                            <i className="fas fa-qrcode mr-2"></i>
                            {showScanner ? 'Tutup Scanner' : 'Scan QR Code'}
                        </button>

                        {/* Scanner */}
                        {showScanner && (
                            <div id="qr-scanner-exit" className="mb-6 rounded-xl overflow-hidden"></div>
                        )}

                        <div className="text-center text-gray-500 my-4">OR</div>

                        {/* Manual Search */}
                        <form onSubmit={handleSearch} className="space-y-6">
                            {/* Search Type */}
                            <div className="flex rounded-xl bg-gray-100 p-1">
                                <button
                                    type="button"
                                    onClick={() => setSearchType('ticketNumber')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${searchType === 'ticketNumber'
                                            ? 'bg-white shadow text-gray-900'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <i className="fas fa-ticket mr-2"></i>
                                    No. Tiket
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSearchType('plateNumber')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${searchType === 'plateNumber'
                                            ? 'bg-white shadow text-gray-900'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <i className="fas fa-car mr-2"></i>
                                    Plat Nomor
                                </button>
                            </div>

                            {/* Search Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {searchType === 'ticketNumber' ? 'Nomor Tiket' : 'Plat Nomor'}
                                </label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(
                                        searchType === 'plateNumber'
                                            ? e.target.value.toUpperCase()
                                            : e.target.value
                                    )}
                                    className="input-field text-center text-xl font-semibold"
                                    placeholder={searchType === 'ticketNumber' ? 'TKT-20240223-ABC123' : 'B 1234 XYZ'}
                                    autoFocus
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-success w-full py-4 text-lg"
                            >
                                {loading ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i>Mencari...</>
                                ) : (
                                    <><i className="fas fa-search mr-2"></i>Cari Tiket</>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step 2: Payment */}
                {step === 2 && ticket && calculation && (
                    <div className="max-w-lg mx-auto animate-fade-in">
                        <div className="glass-card rounded-3xl overflow-hidden">
                            {/* Ticket Info */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white/80 text-sm">No. Tiket</p>
                                        <p className="text-xl font-bold">{ticket.ticketNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/80 text-sm">Plat Nomor</p>
                                        <p className="text-xl font-bold">{ticket.plateNumber}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Calculation Details */}
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-500">Jenis Kendaraan</span>
                                    <span className="font-medium capitalize">{ticket.vehicleType}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-500">Waktu Masuk</span>
                                    <span className="font-medium">
                                        {new Date(ticket.entryTime).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-500">Waktu Keluar</span>
                                    <span className="font-medium">
                                        {new Date(calculation.exitTime).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-500">Durasi</span>
                                    <span className="font-medium">{calculation.formattedDuration}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-500">Tarif</span>
                                    <span className="font-medium">
                                        Rp. {calculation.ratePerHour?.toLocaleString('id-ID')}/jam
                                    </span>
                                </div>

                                {/* Total */}
                                <div className="bg-green-50 -mx-6 px-6 py-4 mt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-700 font-medium">Total Bayar</span>
                                        <span className="text-3xl font-bold text-green-600">
                                            {calculation.formattedAmount}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Metode Pembayaran
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { value: 'cash', label: 'Tunai', icon: 'fa-money-bill' },
                                            { value: 'card', label: 'Kartu', icon: 'fa-credit-card' },
                                            { value: 'digital', label: 'E-Wallet', icon: 'fa-wallet' },
                                            { value: 'monthly_pass', label: 'Member', icon: 'fa-id-card' }
                                        ].map((method) => (
                                            <button
                                                key={method.value}
                                                type="button"
                                                onClick={() => setPaymentMethod(method.value)}
                                                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${paymentMethod === method.value
                                                        ? 'border-green-500 bg-green-50 text-green-700'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <i className={`fas ${method.icon}`}></i>
                                                <span className="text-sm font-medium">{method.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleNewSearch}
                                        className="btn-outline flex-1"
                                    >
                                        <i className="fas fa-arrow-left mr-2"></i>
                                        Kembali
                                    </button>
                                    <button
                                        onClick={handlePayment}
                                        disabled={loading}
                                        className="btn-success flex-1"
                                    >
                                        {loading ? (
                                            <><i className="fas fa-spinner fa-spin mr-2"></i>Memproses...</>
                                        ) : (
                                            <><i className="fas fa-check mr-2"></i>Bayar</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Receipt */}
                {step === 3 && payment && (
                    <div className="max-w-md mx-auto animate-fade-in">
                        <div className="glass-card rounded-3xl overflow-hidden print-area">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-6 text-white text-center">
                                <i className="fas fa-check-circle text-5xl mb-3"></i>
                                <h2 className="text-2xl font-bold">Pembayaran Berhasil!</h2>
                            </div>

                            {/* Receipt Details */}
                            <div className="p-6 space-y-4 bg-white">
                                <div className="text-center pb-4 border-b border-dashed">
                                    <p className="text-gray-500 text-sm">No. Receipt</p>
                                    <p className="text-xl font-bold">{payment.receiptNumber}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Dibayar</span>
                                        <span className="font-bold text-green-600">{payment.formattedAmount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Metode</span>
                                        <span className="font-medium capitalize">{payment.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Durasi</span>
                                        <span className="font-medium">{payment.formattedDuration}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Waktu</span>
                                        <span className="font-medium">
                                            {new Date(payment.paidAt).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 p-4 text-center">
                                <p className="text-gray-600 font-medium">Terima kasih!</p>
                                <p className="text-gray-500 text-sm">Silakan keluar melalui portal</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 mt-6 no-print">
                            <button
                                onClick={handlePrint}
                                className="btn-primary flex-1"
                            >
                                <i className="fas fa-print mr-2"></i>
                                Cetak Receipt
                            </button>
                            <button
                                onClick={handleNewSearch}
                                className="btn-outline flex-1"
                            >
                                <i className="fas fa-redo mr-2"></i>
                                Transaksi Baru
                            </button>
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

export default Exit;