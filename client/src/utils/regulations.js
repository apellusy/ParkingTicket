const REGULATION_KEY = 'parkingRegulations';
const REPORT_TRACKER_KEY = 'parkingReportTracker';

export const DEFAULT_REGULATIONS = {
  autoMarkLost: {
    enabled: true,
    hoursThreshold: 24,
    description: 'Tandai tiket sebagai hilang setelah melebihi batas waktu',
  },
  autoReport: {
    enabled: true,
    reportTime: '08:00',
    recipients: ['admin', 'operator'],
    description: 'Kirim laporan otomatis tiket hilang ke dashboard',
  },
};

export const loadRegulations = () => {
  try {
    const stored = localStorage.getItem(REGULATION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        autoMarkLost: { ...DEFAULT_REGULATIONS.autoMarkLost, ...parsed.autoMarkLost },
        autoReport: { ...DEFAULT_REGULATIONS.autoReport, ...parsed.autoReport },
      };
    }
  } catch (e) {
    console.warn('Failed to load regulations from localStorage:', e);
  }
  return { ...DEFAULT_REGULATIONS };
};

export const saveRegulations = (regulations) => {
  try {
    localStorage.setItem(REGULATION_KEY, JSON.stringify(regulations));
    return true;
  } catch (e) {
    console.error('Failed to save regulations:', e);
    return false;
  }
};

/**
 * Check if a ticket should be auto-marked as lost.
 * @param {Object} ticket - ticket object with entryTime
 * @param {Object} regulations - loaded regulation settings
 * @returns {boolean}
 */
export const shouldMarkTicketLost = (ticket, regulations) => {
  if (!regulations?.autoMarkLost?.enabled) return false;
  const threshold = regulations.autoMarkLost.hoursThreshold * 60 * 60 * 1000;
  const elapsed = Date.now() - new Date(ticket.entryTime).getTime();
  return elapsed >= threshold;
};

/**
 * Check if the auto-report should fire now.
 * Uses a daily tracker to prevent duplicate reports.
 * @param {Object} regulations - loaded regulation settings
 * @returns {boolean}
 */
export const shouldFireAutoReport = (regulations) => {
  if (!regulations?.autoReport?.enabled) return false;

  const now = new Date();
  const [targetHour, targetMinute] = regulations.autoReport.reportTime.split(':').map(Number);
  const todayKey = now.toDateString();

  try {
    const tracker = JSON.parse(localStorage.getItem(REPORT_TRACKER_KEY) || '{}');
    if (tracker.lastReportDate === todayKey) return false;
  } catch (e) {
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return (
    currentHour > targetHour ||
    (currentHour === targetHour && currentMinute >= targetMinute)
  );
};

export const markReportDelivered = () => {
  try {
    const todayKey = new Date().toDateString();
    localStorage.setItem(REPORT_TRACKER_KEY, JSON.stringify({ lastReportDate: todayKey }));
  } catch (e) {
    console.warn('Failed to mark report delivered:', e);
  }
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