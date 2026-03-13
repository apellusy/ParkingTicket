import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/common/Sidebar';
import Loading from '../components/common/Loading';
import { adminService, ticketService } from '../services/api';
import { showError, showSuccess, showConfirm } from '../utils/alerts';
import {
  fetchRegulations,
  saveRegulations,
  clearReportTracker,
  DEFAULT_REGULATIONS,
  describeAutoMarkRule,
} from '../utils/regulations';
import {
  getCachedRegulations,
  getCachedSettings,
  getCachedDashboard,
  invalidateRegulationsCache,
  invalidateSettingsCache,
  invalidateDashboardCache,
} from '../utils/dashboardCache';

const vehicleTypeMap = {
  car: 'Mobil',
  motorcycle: 'Sepeda Motor',
  truck: 'Truk',
  suv: 'SUV',
};

const roleMap = {
  admin: 'Admin',
  operator: 'Operator',
  user: 'Pengguna',
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// Stable fetchers (defined outside the component so they're stable refs)
// getCachedSettings / getCachedDashboard use these as the actual API callers,
// but only invoke them when the cache entry has expired.

async function fetchSettingsData() {
  const res = await adminService.getSettings();
  return res.data.data.settings;
}

// Compatible with getCachedDashboard returns { stats, lostTickets }
async function fetchDashboardData() {
  const [dashRes, lostRes] = await Promise.all([
    adminService.getDashboard(),
    ticketService.search({ status: 'lost', limit: 100 }),
  ]);
  return {
    stats:       dashRes.data.success ? dashRes.data.data            : null,
    lostTickets: lostRes.data.success ? lostRes.data.data.tickets || [] : [],
  };
}

const ToggleSwitch = ({ checked, onChange, disabled = false, label, description }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1">
      {label && <p className="text-sm font-medium text-gray-900">{label}</p>}
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const Settings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    parking_name: '',
    parking_address: '',
    max_capacity: 100,
  });
  const [generalDirty, setGeneralDirty] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [activeCount, setActiveCount] = useState(null);

  // Rates / Users / Blacklist
  const [rates, setRates] = useState([]);
  const [users, setUsers] = useState([]);
  const [blacklist, setBlacklist] = useState([]);

  // Regulations
  const [regulations, setRegulations] = useState(DEFAULT_REGULATIONS);
  const [regulationDirty, setRegulationDirty] = useState(false);
  const [savingRegulations, setSavingRegulations] = useState(false);
  const [regulationsLoading, setRegulationsLoading] = useState(false);

  // Load data per active tab

  const loadGeneral = useCallback(async () => {
    setLoading(true);
    try {
      const [{ settings }, { stats }] = await Promise.all([
        getCachedSettings(fetchSettingsData),
        getCachedDashboard(fetchDashboardData),
      ]);
      setGeneralSettings({
        parking_name:    settings.parking_name    || '',
        parking_address: settings.parking_address || '',
        max_capacity:    settings.max_capacity    ?? 100,
      });
      setActiveCount(stats?.activeTickets ?? null);
    } catch {
      showError('Gagal memuat pengaturan umum');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabData = useCallback(async (tab) => {
    if (tab === 'general') { loadGeneral(); return; }

    if (tab === 'regulations') {
      setRegulationsLoading(true);
      try {
        // getCachedRegulations serves from cache for up to 5 minutes
        const { regs } = await getCachedRegulations(fetchRegulations);
        setRegulations(regs);
        setRegulationDirty(false);
      } catch {
        showError('Gagal memuat regulasi');
      } finally {
        setRegulationsLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      if (tab === 'rates') {
        const res = await adminService.getRates();
        setRates(res.data.data.rates || []);
      } else if (tab === 'users') {
        const res = await adminService.getUsers();
        setUsers(res.data.data.users || []);
      } else if (tab === 'blacklist') {
        const res = await adminService.getBlacklist();
        setBlacklist(res.data.data.blacklist || []);
      }
    } catch {
      showError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [loadGeneral]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  // General settings handlers

  const updateGeneral = (key, value) => {
    setGeneralSettings((prev) => ({ ...prev, [key]: value }));
    setGeneralDirty(true);
  };

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      await adminService.updateSettings({
        parking_name:    generalSettings.parking_name,
        parking_address: generalSettings.parking_address,
        max_capacity:    parseInt(generalSettings.max_capacity) || 100,
      });
      // Bust the settings cache so the next read reflects the saved values
      invalidateSettingsCache();
      showSuccess('Pengaturan umum berhasil disimpan');
      setGeneralDirty(false);
    } catch {
      showError('Gagal menyimpan pengaturan umum');
    } finally {
      setSavingGeneral(false);
    }
  };

  // Regulation handlers

  const updateRegulation = (section, key, value) => {
    setRegulations((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setRegulationDirty(true);
  };

  const handleSaveRegulations = async () => {
    setSavingRegulations(true);
    try {
      const ok = await saveRegulations(regulations);
      if (ok) {
        // Bust the regulations cache so the next getCachedRegulations() call
        // re-fetches — ActiveTickets and AdminDashboard pick up changes within
        // their next regulation check cycle (≤ 60 s).
        invalidateRegulationsCache();
        showSuccess('Pengaturan regulasi berhasil disimpan');
        setRegulationDirty(false);
      } else {
        showError('Gagal menyimpan pengaturan');
      }
    } catch {
      showError('Gagal menyimpan pengaturan');
    } finally {
      setSavingRegulations(false);
    }
  };

  const handleResetRegulations = async () => {
    const result = await showConfirm(
      'Reset semua pengaturan regulasi ke nilai default?',
      'Reset Regulasi', 'Ya, Reset', 'Batal'
    );
    if (!result.isConfirmed) return;
    await saveRegulations({ ...DEFAULT_REGULATIONS });
    invalidateRegulationsCache();
    setRegulations({ ...DEFAULT_REGULATIONS });
    clearReportTracker();
    showSuccess('Regulasi direset ke default');
    setRegulationDirty(false);
  };

  const handleClearReportTracker = async () => {
    const result = await showConfirm(
      'Reset tracker laporan? Laporan otomatis akan dikirim ulang hari ini jika waktunya sudah lewat.',
      'Reset Tracker', 'Ya, Reset', 'Batal'
    );
    if (!result.isConfirmed) return;
    clearReportTracker();
    showSuccess('Tracker laporan berhasil direset');
  };

  // Rates / Users / Blacklist handlers

  const handleSaveRate = async (rate) => {
    try {
      await adminService.updateRate(rate.vehicleType, {
        ratePerHour:         rate.ratePerHour,
        dailyMax:            rate.dailyMax,
        gracePeriodMinutes:  rate.gracePeriodMinutes,
        lostTicketFee:       rate.lostTicketFee,
      });
      showSuccess('Tarif berhasil diperbarui');
      loadTabData('rates');
    } catch {
      showError('Gagal memperbarui tarif');
    }
  };

  const handleToggleUser = async (user) => {
    const result = await showConfirm(
      `${user.isActive ? 'Nonaktifkan' : 'Aktifkan'} pengguna ${user.username}?`,
      'Konfirmasi'
    );
    if (!result.isConfirmed) return;
    try {
      await adminService.updateUser(user.id, { isActive: !user.isActive });
      showSuccess('Pengguna berhasil diperbarui');
      loadTabData('users');
    } catch {
      showError('Gagal memperbarui pengguna');
    }
  };

  const handleRemoveBlacklist = async (item) => {
    const result = await showConfirm(`Hapus ${item.plateNumber} dari blacklist?`, 'Konfirmasi');
    if (!result.isConfirmed) return;
    try {
      await adminService.removeFromBlacklist(item.id);
      showSuccess('Berhasil dihapus dari blacklist');
      loadTabData('blacklist');
    } catch {
      showError('Gagal menghapus dari blacklist');
    }
  };

  // Discard unsaved regulation changes and reload from cache/server
  const handleCancelRegulations = useCallback(async () => {
    invalidateRegulationsCache();
    setRegulationsLoading(true);
    try {
      const { regs } = await getCachedRegulations(fetchRegulations);
      setRegulations(regs);
      setRegulationDirty(false);
    } catch {
      showError('Gagal memuat regulasi');
    } finally {
      setRegulationsLoading(false);
    }
  }, []);

  const tabs = [
    { id: 'general',     label: 'Umum',      icon: 'fa-cog',        badge: generalDirty },
    { id: 'rates',       label: 'Tarif',     icon: 'fa-money-bill' },
    { id: 'users',       label: 'Pengguna',  icon: 'fa-users' },
    { id: 'blacklist',   label: 'Blacklist', icon: 'fa-ban' },
    { id: 'regulations', label: 'Regulasi',  icon: 'fa-shield-alt', badge: regulationDirty },
  ];

  const scheduledPreview = (() => {
    const { scheduledDate, scheduledTime } = regulations.autoMarkLost;
    if (!scheduledDate || !scheduledTime) return null;
    const dt = new Date(`${scheduledDate}T${scheduledTime}:00`);
    if (isNaN(dt)) return null;
    return { dt, isPast: dt < new Date() };
  })();

  const capacityPct = activeCount !== null
    ? Math.min(Math.round((activeCount / (parseInt(generalSettings.max_capacity) || 100)) * 100), 100)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[260px]">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center px-5 py-3 gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
            >
              <i className="fas fa-bars text-gray-600 text-sm"></i>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Pengaturan</h1>
          </div>
        </header>

        <div className="p-5">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm mb-5">
            <div className="flex border-b overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* General Tab */}
          {activeTab === 'general' && (
            loading ? <Loading text="Memuat..." /> : (
              <div className="space-y-5">
                {generalDirty && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-700 text-sm">
                      <i className="fas fa-circle text-amber-400 text-xs"></i>
                      Ada perubahan yang belum disimpan
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { loadGeneral(); setGeneralDirty(false); }}
                        className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                      >
                        Batalkan
                      </button>
                      <button
                        onClick={handleSaveGeneral}
                        disabled={savingGeneral}
                        className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                      >
                        Simpan Sekarang
                      </button>
                    </div>
                  </div>
                )}

                {/* Parking identity */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <i className="fas fa-building text-blue-500"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Identitas Parkir</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Ditampilkan pada tiket yang dicetak</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Parkir</label>
                      <input
                        type="text"
                        value={generalSettings.parking_name}
                        onChange={(e) => updateGeneral('parking_name', e.target.value)}
                        placeholder="Smart Parking"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">Muncul sebagai judul di bagian atas tiket cetak</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat Parkir</label>
                      <textarea
                        value={generalSettings.parking_address}
                        onChange={(e) => updateGeneral('parking_address', e.target.value)}
                        placeholder="Jl. Contoh No. 123, Jakarta"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">Dicetak di bawah nama parkir pada tiket</p>
                    </div>
                  </div>
                </div>

                {/* Capacity */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <i className="fas fa-car text-green-500"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Kapasitas Parkir</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Tiket baru tidak dapat dibuat jika kapasitas sudah penuh</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-5">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Kapasitas Maksimum</label>
                        <input
                          type="number" min="1" max="9999"
                          value={generalSettings.max_capacity}
                          onChange={(e) => updateGeneral('max_capacity', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Jumlah kendaraan maksimum yang boleh parkir bersamaan</p>
                      </div>
                      {activeCount !== null && (
                        <div className="flex-shrink-0 mt-6 text-center">
                          <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 ${
                            capacityPct >= 90 ? 'border-red-400 bg-red-50' :
                            capacityPct >= 70 ? 'border-amber-400 bg-amber-50' : 'border-green-400 bg-green-50'
                          }`}>
                            <span className={`text-xl font-bold leading-none ${
                              capacityPct >= 90 ? 'text-red-600' :
                              capacityPct >= 70 ? 'text-amber-600' : 'text-green-600'
                            }`}>{capacityPct}%</span>
                            <span className="text-xs text-gray-500 mt-0.5">terisi</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1.5">
                            {activeCount} / {parseInt(generalSettings.max_capacity) || 100}
                          </p>
                        </div>
                      )}
                    </div>
                    {capacityPct >= 90 && (
                      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
                        <i className="fas fa-exclamation-triangle mr-1.5"></i>
                        Kapasitas hampir penuh! Tiket baru akan diblokir saat mencapai{' '}
                        {parseInt(generalSettings.max_capacity) || 100} kendaraan.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => { loadGeneral(); setGeneralDirty(false); }}
                    disabled={!generalDirty}
                    className="px-5 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    Batalkan Perubahan
                  </button>
                  <button
                    onClick={handleSaveGeneral}
                    disabled={!generalDirty || savingGeneral}
                    className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                  >
                    {savingGeneral ? (
                      <><i className="fas fa-spinner fa-spin"></i>Menyimpan…</>
                    ) : (
                      <><i className="fas fa-save"></i>Simpan Pengaturan</>
                    )}
                  </button>
                </div>
              </div>
            )
          )}

          {/* Rates Tab */}
          {activeTab === 'rates' && (
            loading ? <Loading text="Memuat..." /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rates.map((rate) => (
                  <div key={rate.id} className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <i className={`fas ${
                          rate.vehicleType === 'motorcycle' ? 'fa-motorcycle' :
                          rate.vehicleType === 'car'        ? 'fa-car' :
                          rate.vehicleType === 'suv'        ? 'fa-car-side' : 'fa-truck'
                        } text-blue-600`}></i>
                      </div>
                      <h3 className="font-semibold text-sm text-gray-900">{vehicleTypeMap[rate.vehicleType]}</h3>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Tarif per Jam (Rp)',    key: 'ratePerHour',        step: '500' },
                        { label: 'Maksimum Harian (Rp)',  key: 'dailyMax',           step: '500' },
                        { label: 'Grace Period (menit)',  key: 'gracePeriodMinutes', step: '1'   },
                      ].map(({ label, key, step }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label}</label>
                          <input
                            type="number" step={step}
                            defaultValue={rate[key]}
                            onBlur={(e) => {
                              rate[key] = step === '1' ? parseInt(e.target.value) : parseFloat(e.target.value);
                            }}
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => handleSaveRate(rate)}
                        className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <i className="fas fa-save mr-1.5"></i>Simpan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            loading ? <Loading text="Memuat..." /> : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto text-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Pengguna', 'Nama', 'Role', 'Status', 'Aksi'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-xs">{user.username}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">{user.fullName || '-'}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {roleMap[user.role] || user.role}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => handleToggleUser(user)}
                              className={`text-xs font-medium ${
                                user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                              }`}
                            >
                              {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Blacklist Tab */}
          {activeTab === 'blacklist' && (
            loading ? <Loading text="Memuat..." /> :
            blacklist.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto text-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Plat Nomor', 'Alasan', 'Level', 'Tanggal', 'Aksi'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {blacklist.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-xs">{item.plateNumber}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">{item.reason || '-'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.severity === 'high'   ? 'bg-red-100 text-red-700' :
                              item.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{item.severity}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => handleRemoveBlacklist(item)}
                              className="text-red-600 hover:text-red-700 text-xs font-medium"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
                <i className="fas fa-check-circle text-4xl mb-2 block text-green-400"></i>
                <p className="text-sm">Tidak ada plat yang di-blacklist</p>
              </div>
            )
          )}

          {/* Regulations Tab */}
          {activeTab === 'regulations' && (
            regulationsLoading ? <Loading text="Memuat regulasi..." /> : (
              <div className="space-y-5">
                {regulationDirty && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-700 text-sm">
                      <i className="fas fa-circle text-amber-400 text-xs"></i>
                      Ada perubahan yang belum disimpan
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelRegulations}
                        className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                      >
                        Batalkan
                      </button>
                      <button
                        onClick={handleSaveRegulations}
                        disabled={savingRegulations}
                        className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                      >
                        Simpan Sekarang
                      </button>
                    </div>
                  </div>
                )}

                {/* Auto-Mark-Lost Card */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <i className="fas fa-clock text-red-500"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Regulasi Tiket Hilang Otomatis</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Tiket aktif akan otomatis ditandai hilang berdasarkan waktu batas yang ditentukan
                      </p>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    <ToggleSwitch
                      checked={regulations.autoMarkLost.enabled}
                      onChange={(v) => updateRegulation('autoMarkLost', 'enabled', v)}
                      label="Aktifkan regulasi auto-mark hilang"
                      description="Sistem akan otomatis menandai tiket aktif sebagai hilang sesuai jadwal yang dipilih"
                    />

                    <div className={`space-y-5 transition-opacity ${regulations.autoMarkLost.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      {/* Mode selector */}
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Mode Regulasi</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => updateRegulation('autoMarkLost', 'mode', 'daily')}
                            className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              regulations.autoMarkLost.mode === 'daily'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-blue-200'
                            }`}
                          >
                            <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              regulations.autoMarkLost.mode === 'daily' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <i className={`fas fa-redo text-sm ${
                                regulations.autoMarkLost.mode === 'daily' ? 'text-blue-600' : 'text-gray-500'
                              }`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${
                                regulations.autoMarkLost.mode === 'daily' ? 'text-blue-700' : 'text-gray-800'
                              }`}>Harian (Berulang)</p>
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                Jalankan setiap hari pada jam yang sama secara otomatis
                              </p>
                            </div>
                            {regulations.autoMarkLost.mode === 'daily' && (
                              <i className="fas fa-check-circle text-blue-500 text-sm absolute top-3 right-3"></i>
                            )}
                          </button>

                          <button
                            onClick={() => updateRegulation('autoMarkLost', 'mode', 'scheduled')}
                            className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              regulations.autoMarkLost.mode === 'scheduled'
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-white hover:border-purple-200'
                            }`}
                          >
                            <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              regulations.autoMarkLost.mode === 'scheduled' ? 'bg-purple-100' : 'bg-gray-100'
                            }`}>
                              <i className={`fas fa-calendar-alt text-sm ${
                                regulations.autoMarkLost.mode === 'scheduled' ? 'text-purple-600' : 'text-gray-500'
                              }`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${
                                regulations.autoMarkLost.mode === 'scheduled' ? 'text-purple-700' : 'text-gray-800'
                              }`}>Terjadwal (Satu Kali)</p>
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                Jalankan satu kali pada tanggal &amp; jam tertentu
                              </p>
                            </div>
                            {regulations.autoMarkLost.mode === 'scheduled' && (
                              <i className="fas fa-check-circle text-purple-500 text-sm absolute top-3 right-3"></i>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Daily config */}
                      {regulations.autoMarkLost.mode === 'daily' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">
                              <i className="fas fa-clock text-blue-500 mr-1.5"></i>Jam Batas Harian
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                              Setiap hari pada jam ini, semua tiket aktif yang masuk{' '}
                              <strong>sebelum jam tersebut</strong> akan ditandai hilang.
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <input
                                type="time"
                                value={regulations.autoMarkLost.cutoffTime}
                                onChange={(e) => updateRegulation('autoMarkLost', 'cutoffTime', e.target.value)}
                                className="px-3 py-2 text-sm border border-blue-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-600">
                                Setiap hari pukul <strong className="text-blue-700">{regulations.autoMarkLost.cutoffTime} WIB</strong>
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {[
                                { label: 'Subuh (05:00)', value: '05:00' },
                                { label: 'Pagi (07:00)',  value: '07:00' },
                                { label: 'Pagi (08:00)',  value: '08:00' },
                                { label: 'Siang (12:00)', value: '12:00' },
                                { label: 'Tengah malam (00:00)', value: '00:00' },
                              ].map(({ label, value }) => (
                                <button
                                  key={value}
                                  onClick={() => updateRegulation('autoMarkLost', 'cutoffTime', value)}
                                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                                    regulations.autoMarkLost.cutoffTime === value
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                  }`}
                                >{label}</button>
                              ))}
                            </div>
                          </div>
                          <div className="bg-white border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                            <i className="fas fa-info-circle mr-1.5 text-blue-500"></i>
                            Sistem memeriksa setiap <strong>60 detik</strong>. Setiap hari pukul{' '}
                            <strong>{regulations.autoMarkLost.cutoffTime}</strong>, semua tiket aktif yang
                            masuk sebelum jam tersebut akan otomatis ditandai hilang.
                          </div>
                        </div>
                      )}

                      {/* Scheduled config */}
                      {regulations.autoMarkLost.mode === 'scheduled' && (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">
                              <i className="fas fa-calendar-alt text-purple-500 mr-1.5"></i>
                              Tanggal &amp; Waktu Eksekusi
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                              Pada tanggal dan jam ini, semua tiket aktif yang masuk{' '}
                              <strong>sebelum waktu tersebut</strong> akan otomatis ditandai hilang.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1 font-medium">Tanggal</label>
                                <input
                                  type="date" min={getTodayStr()}
                                  value={regulations.autoMarkLost.scheduledDate}
                                  onChange={(e) => updateRegulation('autoMarkLost', 'scheduledDate', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-purple-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1 font-medium">Jam</label>
                                <input
                                  type="time"
                                  value={regulations.autoMarkLost.scheduledTime}
                                  onChange={(e) => updateRegulation('autoMarkLost', 'scheduledTime', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-purple-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-2">Preset jam:</p>
                              <div className="flex flex-wrap gap-2">
                                {['07:00','08:00','12:00','17:00','00:00'].map((value) => (
                                  <button
                                    key={value}
                                    onClick={() => updateRegulation('autoMarkLost', 'scheduledTime', value)}
                                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                                      regulations.autoMarkLost.scheduledTime === value
                                        ? 'bg-purple-600 text-white border-purple-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                                    }`}
                                  >{value}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                          {scheduledPreview ? (
                            <div className={`flex items-start gap-2.5 rounded-lg p-3 text-xs border ${
                              scheduledPreview.isPast
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-white border-purple-100 text-purple-800'
                            }`}>
                              <i className={`fas mt-0.5 ${
                                scheduledPreview.isPast ? 'fa-exclamation-triangle text-red-500' : 'fa-calendar-check text-purple-500'
                              }`}></i>
                              <span>
                                {scheduledPreview.isPast ? (
                                  <><strong>Peringatan:</strong> Tanggal yang dipilih sudah lewat. Regulasi akan segera aktif dan menandai tiket saat ini.</>
                                ) : (
                                  <>Semua tiket aktif yang masuk sebelum <strong>{scheduledPreview.dt.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong> akan otomatis ditandai hilang.</>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="bg-white border border-purple-100 rounded-lg p-3 text-xs text-gray-500">
                              <i className="fas fa-info-circle mr-1.5 text-purple-400"></i>
                              Pilih tanggal dan jam eksekusi untuk melihat pratinjau.
                            </div>
                          )}
                        </div>
                      )}

                      {regulations.autoMarkLost.enabled && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-2 text-xs text-gray-700">
                          <i className="fas fa-shield-alt text-gray-400 mt-0.5"></i>
                          <span>{describeAutoMarkRule(regulations)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Auto-Report Card */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <i className="fas fa-file-alt text-blue-500"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Laporan Otomatis</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Notifikasi laporan tiket hilang akan muncul di dashboard secara terjadwal
                      </p>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    <ToggleSwitch
                      checked={regulations.autoReport.enabled}
                      onChange={(v) => updateRegulation('autoReport', 'enabled', v)}
                      label="Aktifkan laporan otomatis"
                      description="Dashboard akan otomatis menampilkan laporan tiket hilang pada waktu yang ditentukan setiap hari"
                    />
                    <div className={`space-y-4 transition-opacity ${regulations.autoReport.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1.5">Waktu Laporan Harian</label>
                        <p className="text-xs text-gray-500 mb-2">
                          Laporan tiket hilang akan muncul otomatis di dashboard setiap hari pada waktu ini.
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="time"
                            value={regulations.autoReport.reportTime}
                            onChange={(e) => updateRegulation('autoReport', 'reportTime', e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-500">
                            Setiap hari pukul <strong>{regulations.autoReport.reportTime}</strong> WIB
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {[
                            { label: 'Pagi (07:00)', value: '07:00' },
                            { label: 'Pagi (08:00)', value: '08:00' },
                            { label: 'Siang (12:00)', value: '12:00' },
                            { label: 'Sore (17:00)', value: '17:00' },
                            { label: 'Malam (20:00)', value: '20:00' },
                          ].map(({ label, value }) => (
                            <button
                              key={value}
                              onClick={() => updateRegulation('autoReport', 'reportTime', value)}
                              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                                regulations.autoReport.reportTime === value
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                              }`}
                            >{label}</button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                        <i className="fas fa-info-circle mr-1.5"></i>
                        Laporan hanya muncul <strong>sekali per hari</strong> per perangkat. Sistem memeriksa jadwal setiap 60 detik.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-red-100">
                  <div className="px-5 py-4 border-b border-red-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <i className="fas fa-exclamation-triangle text-red-500"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-red-700">Zona Bahaya</h3>
                      <p className="text-xs text-red-400 mt-0.5">Tindakan ini bersifat permanen atau tidak dapat dibatalkan</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Reset tracker laporan</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Memaksa laporan otomatis muncul kembali hari ini jika waktu sudah lewat
                        </p>
                      </div>
                      <button
                        onClick={handleClearReportTracker}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <i className="fas fa-redo mr-1"></i>Reset
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-red-800">Reset semua regulasi</p>
                        <p className="text-xs text-red-500 mt-0.5">Kembalikan semua pengaturan regulasi ke nilai default</p>
                      </div>
                      <button
                        onClick={handleResetRegulations}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <i className="fas fa-undo mr-1"></i>Reset Default
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleCancelRegulations}
                    disabled={!regulationDirty}
                    className="px-5 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    Batalkan Perubahan
                  </button>
                  <button
                    onClick={handleSaveRegulations}
                    disabled={!regulationDirty || savingRegulations}
                    className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                  >
                    {savingRegulations ? (
                      <><i className="fas fa-spinner fa-spin"></i>Menyimpan…</>
                    ) : (
                      <><i className="fas fa-save"></i>Simpan Regulasi</>
                    )}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;