import { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Loading from '../components/common/Loading';
import { adminService } from '../services/api';
import { showError, showSuccess, showConfirm } from '../utils/alerts';
import {
  loadRegulations,
  saveRegulations,
  clearReportTracker,
  DEFAULT_REGULATIONS,
} from '../utils/regulations';

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

// ─── Toggle Switch Component ────────────────────────────────────────────────

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

// ─── Main Component ─────────────────────────────────────────────────────────

const Settings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('rates');
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState([]);
  const [users, setUsers] = useState([]);
  const [blacklist, setBlacklist] = useState([]);

  // Regulation state
  const [regulations, setRegulations] = useState(loadRegulations());
  const [regulationDirty, setRegulationDirty] = useState(false);
  const [savingRegulations, setSavingRegulations] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'regulations') fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'rates') {
        const res = await adminService.getRates();
        setRates(res.data.data.rates || []);
      } else if (activeTab === 'users') {
        const res = await adminService.getUsers();
        setUsers(res.data.data.users || []);
      } else if (activeTab === 'blacklist') {
        const res = await adminService.getBlacklist();
        setBlacklist(res.data.data.blacklist || []);
      }
    } catch {
      showError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Regulation Helpers ─────────────────────────────────────────────────

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
      const ok = saveRegulations(regulations);
      if (ok) {
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
      'Reset Regulasi',
      'Ya, Reset',
      'Batal'
    );
    if (!result.isConfirmed) return;

    setRegulations({ ...DEFAULT_REGULATIONS });
    saveRegulations({ ...DEFAULT_REGULATIONS });
    clearReportTracker();
    showSuccess('Regulasi direset ke default');
    setRegulationDirty(false);
  };

  const handleClearReportTracker = async () => {
    const result = await showConfirm(
      'Reset tracker laporan? Laporan otomatis akan dikirim ulang hari ini jika waktunya sudah lewat.',
      'Reset Tracker',
      'Ya, Reset',
      'Batal'
    );
    if (!result.isConfirmed) return;
    clearReportTracker();
    showSuccess('Tracker laporan berhasil direset');
  };

  // ─── Rate / User / Blacklist Actions ───────────────────────────────────

  const handleSaveRate = async (rate) => {
    try {
      await adminService.updateRate(rate.vehicleType, {
        ratePerHour: rate.ratePerHour,
        dailyMax: rate.dailyMax,
        gracePeriodMinutes: rate.gracePeriodMinutes,
        lostTicketFee: rate.lostTicketFee,
      });
      showSuccess('Tarif berhasil diperbarui');
      fetchData();
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
      fetchData();
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
      fetchData();
    } catch {
      showError('Gagal menghapus dari blacklist');
    }
  };

  // ─── Tabs Config ────────────────────────────────────────────────────────

  const tabs = [
    { id: 'rates', label: 'Tarif', icon: 'fa-money-bill' },
    { id: 'users', label: 'Pengguna', icon: 'fa-users' },
    { id: 'blacklist', label: 'Blacklist', icon: 'fa-ban' },
    { id: 'regulations', label: 'Regulasi', icon: 'fa-shield-alt', badge: regulationDirty },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────

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
              <h1 className="text-lg font-bold text-gray-900">Pengaturan</h1>
            </div>
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

          {/* ── Rates Tab ────────────────────────────────────────────────────── */}
          {activeTab === 'rates' && (
            loading ? (
              <Loading text="Memuat..." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rates.map((rate) => (
                  <div key={rate.id} className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <i
                          className={`fas ${
                            rate.vehicleType === 'motorcycle'
                              ? 'fa-motorcycle'
                              : rate.vehicleType === 'car'
                              ? 'fa-car'
                              : rate.vehicleType === 'suv'
                              ? 'fa-car-side'
                              : 'fa-truck'
                          } text-blue-600`}
                        ></i>
                      </div>
                      <h3 className="font-semibold text-sm text-gray-900">
                        {vehicleTypeMap[rate.vehicleType]}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: 'Tarif per Jam (Rp)', key: 'ratePerHour', type: 'number', step: '500' },
                        { label: 'Maksimum Harian (Rp)', key: 'dailyMax', type: 'number', step: '500' },
                        { label: 'Grace Period (menit)', key: 'gracePeriodMinutes', type: 'number', step: '1' },
                      ].map(({ label, key, type, step }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label}</label>
                          <input
                            type={type}
                            step={step}
                            defaultValue={rate[key]}
                            onBlur={(e) => {
                              rate[key] = type === 'number' && step === '1'
                                ? parseInt(e.target.value)
                                : parseFloat(e.target.value);
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

          {/* ── Users Tab ────────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            loading ? (
              <Loading text="Memuat..." />
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto text-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Pengguna', 'Nama', 'Role', 'Status', 'Aksi'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                            {h}
                          </th>
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
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {user.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => handleToggleUser(user)}
                              className={`text-xs font-medium ${
                                user.isActive
                                  ? 'text-red-600 hover:text-red-700'
                                  : 'text-green-600 hover:text-green-700'
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

          {/* ── Blacklist Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'blacklist' && (
            loading ? (
              <Loading text="Memuat..." />
            ) : blacklist.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto text-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Plat Nomor', 'Alasan', 'Level', 'Tanggal', 'Aksi'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {blacklist.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-xs">{item.plateNumber}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">{item.reason || '-'}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                item.severity === 'high'
                                  ? 'bg-red-100 text-red-700'
                                  : item.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {item.severity}
                            </span>
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

          {/* ── Regulations Tab ──────────────────────────────────────────────── */}
          {activeTab === 'regulations' && (
            <div className="space-y-5">
              {/* Unsaved changes banner */}
              {regulationDirty && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-700 text-sm">
                    <i className="fas fa-circle text-amber-400 text-xs"></i>
                    Ada perubahan yang belum disimpan
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRegulations(loadRegulations());
                        setRegulationDirty(false);
                      }}
                      className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                    >
                      Batalkan
                    </button>
                    <button
                      onClick={handleSaveRegulations}
                      disabled={savingRegulations}
                      className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                      Simpan Sekarang
                    </button>
                  </div>
                </div>
              )}

              {/* ── Section: Auto Mark Lost ─────────────────────────────────── */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <i className="fas fa-clock text-red-500"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">Regulasi Tiket Hilang Otomatis</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Tiket yang melebihi batas waktu akan otomatis ditandai hilang
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  <ToggleSwitch
                    checked={regulations.autoMarkLost.enabled}
                    onChange={(v) => updateRegulation('autoMarkLost', 'enabled', v)}
                    label="Aktifkan regulasi auto-mark hilang"
                    description="Sistem akan secara otomatis menandai tiket yang melebihi batas waktu sebagai hilang"
                  />

                  {/* Threshold hours */}
                  <div className={`transition-opacity ${regulations.autoMarkLost.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Batas Waktu Tiket Hilang
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Tiket akan otomatis ditandai hilang setelah kendaraan parkir selama lebih dari
                      batas waktu yang ditentukan.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="168"
                        step="1"
                        value={regulations.autoMarkLost.hoursThreshold}
                        onChange={(e) =>
                          updateRegulation('autoMarkLost', 'hoursThreshold', parseInt(e.target.value))
                        }
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="168"
                          value={regulations.autoMarkLost.hoursThreshold}
                          onChange={(e) =>
                            updateRegulation(
                              'autoMarkLost',
                              'hoursThreshold',
                              Math.max(1, Math.min(168, parseInt(e.target.value) || 1))
                            )
                          }
                          className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">jam</span>
                      </div>
                    </div>

                    {/* Preset buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[
                        { label: '12 jam', value: 12 },
                        { label: '24 jam', value: 24 },
                        { label: '48 jam', value: 48 },
                        { label: '72 jam', value: 72 },
                        { label: '1 minggu', value: 168 },
                      ].map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => updateRegulation('autoMarkLost', 'hoursThreshold', value)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                            regulations.autoMarkLost.hoursThreshold === value
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Info box */}
                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                      <i className="fas fa-info-circle mr-1.5"></i>
                      Sistem memeriksa tiket setiap <strong>60 detik</strong>. Tiket yang masuk{' '}
                      <strong>lebih dari {regulations.autoMarkLost.hoursThreshold} jam yang lalu</strong> akan
                      otomatis ditandai hilang.
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section: Auto Report ────────────────────────────────────── */}
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
                    {/* Report time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1.5">
                        Waktu Laporan Harian
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Laporan tiket hilang akan muncul otomatis di dashboard setiap hari pada waktu ini.
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="time"
                          value={regulations.autoReport.reportTime}
                          onChange={(e) =>
                            updateRegulation('autoReport', 'reportTime', e.target.value)
                          }
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-500">
                          Setiap hari pukul{' '}
                          <strong>
                            {regulations.autoReport.reportTime}
                          </strong>{' '}
                          WIB
                        </span>
                      </div>

                      {/* Quick time presets */}
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
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                      <i className="fas fa-info-circle mr-1.5"></i>
                      Laporan hanya muncul <strong>sekali per hari</strong>. Sistem memeriksa jadwal
                      setiap 60 detik. Laporan akan memuat semua tiket dengan status hilang saat itu.
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section: Danger Zone ────────────────────────────────────── */}
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
                      <p className="text-xs text-red-500 mt-0.5">
                        Kembalikan semua pengaturan regulasi ke nilai default
                      </p>
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

              {/* Save button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setRegulations(loadRegulations());
                    setRegulationDirty(false);
                  }}
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
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Menyimpan…
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Simpan Regulasi
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;