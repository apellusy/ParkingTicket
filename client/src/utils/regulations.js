import { adminService } from '../services/api';

// The report tracker stays in localStorage intentionally —
// it tracks whether THIS browser/device has already shown today's
// report popup. Each device should show it independently.
const REPORT_TRACKER_KEY = 'parkingReportTracker';

export const DEFAULT_REGULATIONS = {
  autoMarkLost: {
    enabled: true,
    mode: 'daily', // 'daily' | 'scheduled'
    cutoffTime: '07:00',
    scheduledDate: '',
    scheduledTime: '07:00',
    description: 'Tandai tiket sebagai hilang berdasarkan waktu batas yang ditentukan',
  },
  autoReport: {
    enabled: true,
    reportTime: '08:00',
    recipients: ['admin', 'operator'],
    description: 'Kirim laporan otomatis tiket hilang ke dashboard',
  },
};

/**
 * Load regulations from the server (stored in the settings table).
 * Falls back to DEFAULT_REGULATIONS if the request fails or keys are missing.
 */
export const fetchRegulations = async () => {
  try {
    const res = await adminService.getSettings();
    const s = res.data.data.settings;

    const autoMarkLost = s.regulation_auto_mark_lost;
    const autoReport = s.regulation_auto_report;

    return {
      autoMarkLost: {
        ...DEFAULT_REGULATIONS.autoMarkLost,
        ...(autoMarkLost && typeof autoMarkLost === 'object' ? autoMarkLost : {}),
      },
      autoReport: {
        ...DEFAULT_REGULATIONS.autoReport,
        ...(autoReport && typeof autoReport === 'object' ? autoReport : {}),
      },
    };
  } catch {
    return { ...DEFAULT_REGULATIONS };
  }
};

/**
 * Persist regulations to the server settings table.
 * Stored under keys: regulation_auto_mark_lost, regulation_auto_report
 */
export const saveRegulations = async (regulations) => {
  try {
    await adminService.updateSettings({
      regulation_auto_mark_lost: regulations.autoMarkLost,
      regulation_auto_report: regulations.autoReport,
    });
    return true;
  } catch {
    return false;
  }
};

// ─── Logic helpers ────────────────────────────────────────────────────────────

const getTodayCutoff = (cutoffTime) => {
  const [hour, minute] = cutoffTime.split(':').map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
};

/**
 * Check if a ticket should be auto-marked as lost.
 *
 * Daily     → ticket entered before today's cutoffTime AND now >= cutoffTime
 * Scheduled → ticket entered before the scheduled datetime AND now >= that datetime
 */
export const shouldMarkTicketLost = (ticket, regulations) => {
  if (!regulations?.autoMarkLost?.enabled) return false;

  const now = Date.now();
  const entryMs = new Date(ticket.entryTime).getTime();

  if (regulations.autoMarkLost.mode === 'daily') {
    const cutoffMs = getTodayCutoff(regulations.autoMarkLost.cutoffTime).getTime();
    return now >= cutoffMs && entryMs < cutoffMs;
  }

  if (regulations.autoMarkLost.mode === 'scheduled') {
    const { scheduledDate, scheduledTime } = regulations.autoMarkLost;
    if (!scheduledDate || !scheduledTime) return false;
    const scheduledMs = new Date(`${scheduledDate}T${scheduledTime}:00`).getTime();
    if (isNaN(scheduledMs)) return false;
    return now >= scheduledMs && entryMs < scheduledMs;
  }

  return false;
};

/** Human-readable summary of the active regulation rule. */
export const describeAutoMarkRule = (regulations) => {
  const r = regulations?.autoMarkLost;
  if (!r?.enabled) return 'Regulasi tiket hilang otomatis: Nonaktif';

  if (r.mode === 'daily') {
    return `Setiap hari pukul ${r.cutoffTime}, semua tiket aktif yang masuk sebelum jam tersebut akan ditandai hilang.`;
  }

  if (r.mode === 'scheduled') {
    if (!r.scheduledDate || !r.scheduledTime) return 'Mode terjadwal — tanggal/waktu belum diset.';
    const dt = new Date(`${r.scheduledDate}T${r.scheduledTime}:00`);
    return `Tiket aktif sebelum ${dt.toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })} akan otomatis ditandai hilang.`;
  }

  return '';
};

// ─── Auto-report tracker (stays per-device in localStorage) ──────────────────

export const shouldFireAutoReport = (regulations) => {
  if (!regulations?.autoReport?.enabled) return false;

  const now = new Date();
  const [targetHour, targetMinute] = regulations.autoReport.reportTime.split(':').map(Number);
  const todayKey = now.toDateString();

  try {
    const tracker = JSON.parse(localStorage.getItem(REPORT_TRACKER_KEY) || '{}');
    if (tracker.lastReportDate === todayKey) return false;
  } catch {}

  return (
    now.getHours() > targetHour ||
    (now.getHours() === targetHour && now.getMinutes() >= targetMinute)
  );
};

export const markReportDelivered = () => {
  try {
    localStorage.setItem(
      REPORT_TRACKER_KEY,
      JSON.stringify({ lastReportDate: new Date().toDateString() })
    );
  } catch {}
};

export const clearReportTracker = () => {
  localStorage.removeItem(REPORT_TRACKER_KEY);
};

export const formatDuration = (entryTime) => {
  const minutes = Math.floor((Date.now() - new Date(entryTime).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}j ${mins}m`;
};