import { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Loading from '../components/common/Loading';
import { paymentService } from '../services/api';
import { showError } from '../utils/alerts';

const PaymentHistory = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [summary, setSummary] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const paymentMethodMap = {
        cash: { label: 'Tunai', icon: 'fa-money-bill', color: 'bg-green-100 text-green-700' },
        card: { label: 'Kartu', icon: 'fa-credit-card', color: 'bg-blue-100 text-blue-700' },
        digital: { label: 'E-Wallet', icon: 'fa-wallet', color: 'bg-yellow-100 text-yellow-700' },
        monthly_pass: { label: 'Member', icon: 'fa-id-card', color: 'bg-purple-100 text-purple-700' }
    };

    useEffect(() => {
        fetchPayments();
    }, [page]);

    const fetchPayments = async () => {
        try {
            const response = await paymentService.getHistory({ page, limit: 20 });
            if (response.data.success) {
                setPayments(response.data.data.payments);
                setSummary(response.data.data.summary);
                setTotalPages(response.data.data.pagination.totalPages);
            }
        } catch (error) {
            showError('Gagal memuat riwayat pembayaran');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="lg:ml-[260px]">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
                            >
                                <i className="fas fa-bars text-gray-600 text-sm"></i>
                            </button>
                            <h1 className="text-lg font-bold text-gray-900">Riwayat Pembayaran</h1>
                        </div>
                    </div>
                </header>

                <div className="p-5">
                    {/* Summary Cards */}
                    {summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                        <i className="fas fa-wallet text-green-600"></i>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Total Pendapatan</p>
                                        <p className="text-lg font-bold text-gray-900 mt-0.5">{summary.formattedTotalAmount}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <i className="fas fa-receipt text-blue-600"></i>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Total Transaksi</p>
                                        <p className="text-lg font-bold text-gray-900 mt-0.5">{summary.totalTransactions}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    {loading ? (
                        <Loading text="Memuat riwayat..." />
                    ) : (
                        <>
                            <div className="bg-white rounded-lg overflow-hidden text-sm">
                                {payments.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">No. Receipt</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Tiket</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Plat</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Durasi</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Metode</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Total</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Waktu</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map((payment) => {
                                                    const method = paymentMethodMap[payment.paymentMethod] || paymentMethodMap.cash;
                                                    return (
                                                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                                                            <td className="px-3 py-2">
                                                                <span className="font-mono text-xs">{payment.receiptNumber}</span>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <span className="font-mono text-xs">{payment.ticket?.ticketNumber}</span>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <span className="font-bold text-xs">{payment.ticket?.plateNumber}</span>
                                                            </td>
                                                            <td className="px-3 py-2 text-xs">{payment.formattedDuration}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${method.color}`}>
                                                                    <i className={`fas ${method.icon}`}></i>
                                                                    {method.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <span className="font-bold text-green-600 text-xs">{payment.formattedAmount}</span>
                                                            </td>
                                                            <td className="px-3 py-2 text-xs text-gray-500">
                                                                {new Date(payment.paidAt).toLocaleString('id-ID', {year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-gray-500 text-sm">
                                        <i className="fas fa-inbox text-3xl mb-2"></i>
                                        <p>Belum ada pembayaran</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center gap-1.5 mt-4">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1.5 text-xs rounded bg-white border disabled:opacity-50"
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>
                                    <span className="px-3 py-1.5 text-xs">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1.5 text-xs rounded bg-white border disabled:opacity-50"
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentHistory;