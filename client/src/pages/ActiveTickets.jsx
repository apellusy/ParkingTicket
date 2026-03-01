import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'react-qr-code';
import Sidebar from '../components/common/Sidebar';
import Loading from '../components/common/Loading';
import { ticketService } from '../services/api';
import { showError, showConfirm, showSuccess } from '../utils/alerts';
import {
  loadRegulations,
  shouldMarkTicketLost,
  formatDuration,
} from '../utils/regulations';

const AUTO_MARK_INTERVAL_MS = 60 * 1000; // check every 60 seconds
const FETCH_INTERVAL_MS = 30 * 1000;

const vehicleTypeMap = {
  car: 'Mobil',
  motorcycle: 'Sepeda Motor',
  truck: 'Truk',
  suv: 'SUV',
};

const vehicleTypes = ['car', 'motorcycle', 'truck', 'suv'];

const getVehicleIcon = (type) => {
  const icons = {
    motorcycle: 'fa-motorcycle',
    car: 'fa-car',
    suv: 'fa-car-side',
    truck: 'fa-truck',
  };
  return icons[type] || 'fa-car';
};

const getVehicleBadgeColor = (type) => {
  const colors = {
    motorcycle: 'bg-orange-100 text-orange-700',
    car: 'bg-blue-100 text-blue-700',
    suv: 'bg-green-100 text-green-700',
    truck: 'bg-red-100 text-red-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};

const ActiveTickets = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [lostTickets, setLostTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [printing, setPrinting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [autoMarkingCount, setAutoMarkingCount] = useState(0);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const regulationsRef = useRef(loadRegulations());

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [activeRes, lostRes] = await Promise.all([
        ticketService.getActive(),
        ticketService.search({ status: 'lost', limit: 100 }),
      ]);
      if (activeRes.data.success) setTickets(activeRes.data.data.tickets || []);
      if (lostRes.data.success) setLostTickets(lostRes.data.data.tickets || []);
    } catch (error) {
      showError('Gagal memuat tiket');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    const fetchInterval = setInterval(() => fetchTickets(true), FETCH_INTERVAL_MS);
    return () => clearInterval(fetchInterval);
  }, [fetchTickets]);

  // ─── Auto-Mark-Lost Engine ────────────────────────────────────────────────

  const runAutoMarkLost = useCallback(async () => {
    const regulations = loadRegulations(); // re-read in case settings changed
    regulationsRef.current = regulations;
    if (!regulations.autoMarkLost.enabled) return;

    const stale = tickets.filter((t) => shouldMarkTicketLost(t, regulations));
    if (stale.length === 0) return;

    setAutoMarkingCount(stale.length);

    const results = await Promise.allSettled(
      stale.map((t) =>
        ticketService.markLost(t.id, { verificationMethod: 'Auto-regulation (time exceeded)' })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    if (succeeded > 0) {
      showSuccess(
        `${succeeded} tiket otomatis ditandai hilang (melewati batas ${regulations.autoMarkLost.hoursThreshold} jam)`
      );
      await fetchTickets(true);
    }

    setAutoMarkingCount(0);
  }, [tickets, fetchTickets]);

  useEffect(() => {
    const autoInterval = setInterval(runAutoMarkLost, AUTO_MARK_INTERVAL_MS);
    // Also run shortly after initial load
    const initTimeout = setTimeout(runAutoMarkLost, 3000);
    return () => {
      clearInterval(autoInterval);
      clearTimeout(initTimeout);
    };
  }, [runAutoMarkLost]);

  // ─── Filtering & Sorting ──────────────────────────────────────────────────

  const filterTickets = useCallback(
    (ticketsToFilter) => {
      let filtered = [...ticketsToFilter];

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.ticketNumber.toLowerCase().includes(term) ||
            t.plateNumber.toLowerCase().includes(term)
        );
      }

      if (vehicleFilter !== 'all') {
        filtered = filtered.filter((t) => t.vehicleType === vehicleFilter);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        filtered = filtered.filter((t) => {
          const ticketDate = new Date(t.entryTime);
          if (dateFilter === 'today') return ticketDate.toDateString() === now.toDateString();
          if (dateFilter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return ticketDate >= weekAgo;
          }
          return true;
        });
      }

      filtered.sort((a, b) => {
        if (sortBy === 'recent') return new Date(b.entryTime) - new Date(a.entryTime);
        if (sortBy === 'oldest') return new Date(a.entryTime) - new Date(b.entryTime);
        if (sortBy === 'duration') {
          return (
            (Date.now() - new Date(b.entryTime).getTime()) -
            (Date.now() - new Date(a.entryTime).getTime())
          );
        }
        return 0;
      });

      return filtered;
    },
    [searchTerm, vehicleFilter, dateFilter, sortBy]
  );

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleMarkLost = async (ticket) => {
    const result = await showConfirm(
      `Tandai tiket ${ticket.ticketNumber} sebagai hilang?`,
      'Konfirmasi',
      'Ya, Tandai',
      'Batal'
    );
    if (!result.isConfirmed) return;

    try {
      await ticketService.markLost(ticket.id, { verificationMethod: 'Manual verification' });
      showSuccess('Tiket ditandai sebagai hilang');
      await fetchTickets(true);
    } catch {
      showError('Gagal memperbarui tiket');
    }
  };

  const handleDeleteLostTicket = async (ticket) => {
    const result = await showConfirm(
      `Hapus tiket hilang ${ticket.ticketNumber} secara permanen?`,
      'Hapus Tiket',
      'Ya, Hapus',
      'Batal'
    );
    if (!result.isConfirmed) return;

    setDeletingId(ticket.id);
    try {
      await ticketService.delete(ticket.id);
      showSuccess('Tiket berhasil dihapus');
      await fetchTickets(true);
    } catch {
      showError('Gagal menghapus tiket');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllLost = async () => {
    setDeletingAll(true);
    try {
      const results = await Promise.allSettled(
        lostTickets.map((t) => ticketService.delete(t.id))
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      if (succeeded > 0) showSuccess(`${succeeded} tiket hilang berhasil dihapus${failed > 0 ? `, ${failed} gagal` : ''}`);
      else showError('Semua penghapusan gagal');

      setShowDeleteAllModal(false);
      await fetchTickets(true);
    } catch {
      showError('Gagal menghapus tiket');
    } finally {
      setDeletingAll(false);
    }
  };

  const handlePrintTicket = async (ticket) => {
    try {
      setPrinting(true);
      const response = await ticketService.print(ticket.id);
      if (response.data.success) {
        setSelectedTicket(response.data.data);
        setTimeout(() => printTicket(response.data.data), 100);
        showSuccess('Tiket siap dicetak');
      }
    } catch {
      showError('Gagal mencetak tiket');
    } finally {
      setPrinting(false);
    }
  };

  const printTicket = (ticketData) => {
    const vehicleLabel = vehicleTypeMap[ticketData.vehicleType] || ticketData.vehicleType;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticketData.qrCodeData)}`;
    const entryDate = new Date(ticketData.entryTime);
    const formattedTime = entryDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = entryDate.toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>Tiket Parkir - ${ticketData.ticketNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:80mm;height:auto}
    body{font-family:'Courier New',monospace;background:#f5f5f5;padding:0}
    @media print{body{background:white;margin:0;padding:0}.page{margin:0;padding:0;box-shadow:none}}
    .page{width:80mm;padding:5mm;background:white;box-shadow:0 0 10px rgba(0,0,0,.1);margin:0 auto}
    .header{font-size:13px;font-weight:bold;text-align:center;margin-bottom:1mm;letter-spacing:.5px;color:#1a1a1a}
    .title{font-size:10px;text-align:center;margin-bottom:3mm;font-weight:bold;border-bottom:1.5px solid #000;padding-bottom:1.5mm;letter-spacing:1px;color:#000}
    .qr-section{display:flex;flex-direction:column;align-items:center;margin-bottom:4mm;background:#fafafa;padding:3mm;border-radius:2px}
    .qr-code{width:45mm;height:45mm;border:2px solid #333;display:flex;align-items:center;justify-content:center;background:white;margin-bottom:2mm;padding:1mm}
    .qr-code img{width:100%;height:100%;display:block}
    .ticket-no{font-size:14px;font-weight:bold;text-align:center;letter-spacing:2px;margin-bottom:1.5mm;color:#1a1a1a}
    .scan-text{font-size:7.5px;text-align:center;margin-bottom:2mm;color:#555;font-style:italic}
    .divider{border-bottom:1px solid #999;margin:2.5mm 0}
    .divider-dashed{border-bottom:1px dashed #999;margin:2mm 0}
    .info-section{font-size:8.5px;line-height:1.4;color:#333}
    .info-row{display:flex;justify-content:space-between;margin:1.5mm 0;padding:.5mm 0;border-bottom:.5px solid #ddd}
    .label{font-weight:bold;width:40%;color:#444}
    .value{width:60%;text-align:right;word-break:break-word;font-family:'Courier New',monospace;font-weight:500}
    .note{font-size:7px;text-align:center;color:#e74c3c;margin-top:2mm;font-weight:bold;padding:1mm;background:#ffebeb;border-radius:2px}
  </style>
</head>
<body>
  <div class="page">
    <div class="header">Smart Parking</div>
    <div class="title">TIKET PARKIR</div>
    <div class="qr-section">
      <div class="qr-code"><img src="${qrUrl}" alt="QR Code"/></div>
      <div class="ticket-no">${ticketData.ticketNumber}</div>
      <div class="scan-text">Pindai atau tunjukkan saat keluar</div>
    </div>
    <div class="divider"></div>
    <div class="info-section">
      <div class="info-row"><span class="label">Plat:</span><span class="value">${ticketData.plateNumber}</span></div>
      <div class="info-row"><span class="label">Jenis:</span><span class="value">${vehicleLabel}</span></div>
      <div class="info-row"><span class="label">Masuk:</span><span class="value">${formattedTime}</span></div>
      <div class="info-row"><span class="label">Tgl:</span><span class="value">${formattedDate}</span></div>
    </div>
    <div class="divider-dashed"></div>
    <div class="note">Hilang = Dikenakan Biaya Tambahan</div>
  </div>
</body></html>`;

    const existing = document.getElementById('print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    const img = iframeDoc.querySelector('img');
    const triggerPrint = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 1500);
    };

    if (img) {
      img.onload = triggerPrint;
      img.onerror = triggerPrint;
    } else {
      setTimeout(triggerPrint, 300);
    }
  };

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const filteredActiveTickets = filterTickets(tickets);
  const filteredLostTickets = filterTickets(lostTickets);
  const displayTickets = activeTab === 'active' ? filteredActiveTickets : filteredLostTickets;
  const regulations = regulationsRef.current;

  // ─── Render ───────────────────────────────────────────────────────────────

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
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <i className="fas fa-bars text-gray-600"></i>
              </button>
              <h1 className="text-lg font-bold text-gray-900">
                {activeTab === 'active' ? 'Tiket Aktif' : 'Tiket Hilang'}
              </h1>
            </div>

            {/* Auto-mark indicator */}
            {autoMarkingCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <i className="fas fa-spinner fa-spin text-xs"></i>
                Menandai {autoMarkingCount} tiket hilang…
              </span>
            )}

            {/* Regulation badge */}
            {regulations.autoMarkLost.enabled && (
              <span
                title={`Regulasi aktif: tiket ditandai hilang setelah ${regulations.autoMarkLost.hoursThreshold} jam`}
                className="hidden sm:flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100"
              >
                <i className="fas fa-shield-alt text-xs"></i>
                Auto-regulasi aktif
              </span>
            )}
          </div>
        </header>

        <div className="p-5">
          {/* Tabs */}
          <div className="flex items-center justify-between mb-5 border-b border-gray-200">
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'active'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fas fa-ticket mr-1.5"></i>
                Aktif ({tickets.length})
              </button>
              <button
                onClick={() => setActiveTab('lost')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'lost'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fas fa-exclamation-circle mr-1.5"></i>
                Hilang ({lostTickets.length})
                {lostTickets.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full leading-none">
                    {lostTickets.length}
                  </span>
                )}
              </button>
            </div>

            {/* Delete All button — only on lost tab */}
            {activeTab === 'lost' && lostTickets.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <i className="fas fa-trash-alt"></i>
                Hapus Semua ({lostTickets.length})
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                <i className="fas fa-search mr-1"></i>Cari
              </label>
              <input
                type="text"
                placeholder="Plat atau No. Tiket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                <i className="fas fa-car mr-1"></i>Jenis Kendaraan
              </label>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Jenis</option>
                {vehicleTypes.map((type) => (
                  <option key={type} value={type}>
                    {vehicleTypeMap[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                <i className="fas fa-calendar mr-1"></i>Tanggal
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Tanggal</option>
                <option value="today">Hari Ini</option>
                <option value="week">Minggu Ini</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                <i className="fas fa-sort mr-1"></i>Urutkan
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="duration">Durasi Terlama</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => fetchTickets()}
                disabled={loading}
                className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-1.5"
              >
                <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                Refresh
              </button>
            </div>
          </div>

          {/* Results Info */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-gray-600">
              Menampilkan{' '}
              <span className="font-semibold">{displayTickets.length}</span> dari{' '}
              <span className="font-semibold">
                {activeTab === 'active' ? tickets.length : lostTickets.length}
              </span>{' '}
              tiket
            </span>
            {activeTab === 'active' && regulations.autoMarkLost.enabled && (
              <span className="text-xs text-gray-400">
                <i className="fas fa-clock mr-1"></i>
                Tiket otomatis ditandai hilang setelah{' '}
                <strong>{regulations.autoMarkLost.hoursThreshold} jam</strong>
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && <Loading text="Memuat tiket..." />}

          {/* Table */}
          {!loading && (
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              {displayTickets.length > 0 ? (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Jenis</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">No. Tiket</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Plat</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Waktu Masuk</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Durasi</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <i className={`fas ${getVehicleIcon(ticket.vehicleType)} text-lg text-gray-500`}></i>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${getVehicleBadgeColor(
                                  ticket.vehicleType
                                )}`}
                              >
                                {vehicleTypeMap[ticket.vehicleType]}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-blue-600 text-xs">
                              {ticket.ticketNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-gray-900">{ticket.plateNumber}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">
                              {new Date(ticket.entryTime).toLocaleString('id-ID', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold text-xs ${
                                activeTab === 'active' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {formatDuration(ticket.entryTime)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {/* View */}
                              <button
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setShowModal(true);
                                }}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                              >
                                <i className="fas fa-eye mr-0.5"></i>Lihat
                              </button>

                              {/* Active-only actions */}
                              {activeTab === 'active' && (
                                <>
                                  <button
                                    onClick={() => handlePrintTicket(ticket)}
                                    disabled={printing}
                                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:bg-gray-200 transition-colors"
                                  >
                                    <i className={`fas fa-print mr-0.5 ${printing ? 'fa-spin' : ''}`}></i>Cetak
                                  </button>
                                  <button
                                    onClick={() => handleMarkLost(ticket)}
                                    className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium hover:bg-amber-200 transition-colors"
                                  >
                                    <i className="fas fa-exclamation-triangle mr-0.5"></i>Hilang
                                  </button>
                                </>
                              )}

                              {/* Lost-only: Delete */}
                              {activeTab === 'lost' && (
                                <button
                                  onClick={() => handleDeleteLostTicket(ticket)}
                                  disabled={deletingId === ticket.id}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 disabled:bg-gray-200 transition-colors"
                                >
                                  {deletingId === ticket.id ? (
                                    <i className="fas fa-spinner fa-spin mr-0.5"></i>
                                  ) : (
                                    <i className="fas fa-trash-alt mr-0.5"></i>
                                  )}
                                  Hapus
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-gray-400">
                  <i className="fas fa-inbox text-4xl mb-3 block"></i>
                  <p className="text-sm font-medium">
                    Tidak ada tiket {activeTab === 'active' ? 'aktif' : 'hilang'}
                  </p>
                  <p className="text-xs mt-1 text-gray-300">
                    {activeTab === 'active'
                      ? 'Semua kendaraan telah keluar atau belum ada yang masuk'
                      : 'Tidak ada tiket yang ditandai hilang'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Ticket Details Modal ─────────────────────────────────────────────── */}
      {showModal && selectedTicket && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">{selectedTicket.ticketNumber}</h3>
                  <p className="text-blue-100 text-xs mt-0.5">{selectedTicket.plateNumber}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white text-xl leading-none">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="flex justify-center mb-5">
                <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
                  {selectedTicket.qrCodeData ? (
                    <QRCode value={selectedTicket.qrCodeData} size={140} level="M" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-gray-400 text-xs text-center">
                      QR tidak tersedia
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1 mb-5 text-sm">
                {[
                  ['Plat Nomor', selectedTicket.plateNumber],
                  ['Jenis Kendaraan', vehicleTypeMap[selectedTicket.vehicleType]],
                  [
                    'Waktu Masuk',
                    new Date(selectedTicket.entryTime).toLocaleString('id-ID'),
                  ],
                  ['Durasi', formatDuration(selectedTicket.entryTime)],
                ].map(([label, value], i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {activeTab === 'active' && (
                  <button
                    onClick={() => {
                      handlePrintTicket(selectedTicket);
                      setShowModal(false);
                    }}
                    disabled={printing}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    <i className={`fas fa-print ${printing ? 'fa-spin' : ''}`}></i>
                    {printing ? 'Cetak...' : 'Cetak'}
                  </button>
                )}
                {activeTab === 'lost' && (
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleDeleteLostTicket(selectedTicket);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <i className="fas fa-trash-alt"></i>
                    Hapus
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors col-span-1"
                >
                  <i className="fas fa-times"></i>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete All Lost Tickets Confirmation Modal ───────────────────────── */}
      {showDeleteAllModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => !deletingAll && e.target === e.currentTarget && setShowDeleteAllModal(false)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Danger header */}
            <div className="bg-red-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-lg"></i>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Hapus Semua Tiket Hilang</h3>
                  <p className="text-red-100 text-xs">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 text-sm mb-4">
                Anda akan menghapus{' '}
                <strong className="text-red-600">{lostTickets.length} tiket hilang</strong> secara
                permanen dari sistem. Pastikan semua tiket telah diproses sebelum menghapus.
              </p>

              {/* Summary */}
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-700 font-medium">
                    <i className="fas fa-ticket mr-1.5"></i>Total tiket akan dihapus
                  </span>
                  <span className="font-bold text-red-700">{lostTickets.length}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  disabled={deletingAll}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteAllLost}
                  disabled={deletingAll}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center justify-center gap-2"
                >
                  {deletingAll ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Menghapus…
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash-alt"></i>
                      Ya, Hapus Semua
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveTickets;