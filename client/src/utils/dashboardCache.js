const DASHBOARD_TTL_MS      = 30 * 1000;   // dashboard stats: 30s
const REGULATIONS_TTL_MS    = 5 * 60 * 1000; // regulation settings: 5min
const SETTINGS_TTL_MS       = 5 * 60 * 1000; // general settings: 5min
const ACTIVE_TICKETS_TTL_MS = 20 * 1000;   // active/lost ticket lists: 20s
const MIN_REFETCH_MS        = 3 * 1000;    // absolute minimum between dashboard fetches

const cache = {
  dashboard:      { data: null, timestamp: 0 },
  lostTickets:    { data: null, timestamp: 0 },
  regulations:    { data: null, timestamp: 0 },
  settings:       { data: null, timestamp: 0 },
  activeTickets:  { data: null, timestamp: 0 },
  lostActive:     { data: null, timestamp: 0 },

  // In-flight promise dedup: concurrent callers share one fetch promise
  _inflight: {
    dashboard:     null,
    regulations:   null,
    settings:      null,
    activeTickets: null,
  },

  _lastFetchAt: 0,
};

function isFresh(entry, ttl) {
  return entry.data !== null && Date.now() - entry.timestamp < ttl;
}

// Dashboard
// Fetcher signature: async () => { stats, lostTickets }
export async function getCachedDashboard(fetcher, force = false) {
  const dashFresh = isFresh(cache.dashboard, DASHBOARD_TTL_MS);
  const lostFresh = isFresh(cache.lostTickets, DASHBOARD_TTL_MS);

  if (!force && dashFresh && lostFresh) {
    return { stats: cache.dashboard.data, lostTickets: cache.lostTickets.data, fromCache: true };
  }

  const now = Date.now();
  if (!force && now - cache._lastFetchAt < MIN_REFETCH_MS) {
    return { stats: cache.dashboard.data, lostTickets: cache.lostTickets.data, fromCache: true };
  }

  if (cache._inflight.dashboard) return cache._inflight.dashboard;

  cache._lastFetchAt = now;
  cache._inflight.dashboard = fetcher()
    .then(({ stats, lostTickets }) => {
      cache.dashboard   = { data: stats,       timestamp: Date.now() };
      cache.lostTickets = { data: lostTickets, timestamp: Date.now() };
      return { stats, lostTickets, fromCache: false };
    })
    .finally(() => { cache._inflight.dashboard = null; });

  return cache._inflight.dashboard;
}

export function invalidateDashboardCache() {
  cache.dashboard.timestamp   = 0;
  cache.lostTickets.timestamp = 0;
}

// Regulations 
// Fetcher signature: async () => regulations object
export async function getCachedRegulations(fetcher) {
  if (isFresh(cache.regulations, REGULATIONS_TTL_MS)) {
    return { regs: cache.regulations.data, fromCache: true };
  }

  if (cache._inflight.regulations) return cache._inflight.regulations;

  cache._inflight.regulations = fetcher()
    .then((regs) => {
      cache.regulations = { data: regs, timestamp: Date.now() };
      return { regs, fromCache: false };
    })
    .finally(() => { cache._inflight.regulations = null; });

  return cache._inflight.regulations;
}

// Call this after saving regulation settings so the next read gets fresh data
export function invalidateRegulationsCache() {
  cache.regulations.timestamp = 0;
}

// General settings
// Fetcher signature: async () => settings plain object (key → value map)
export async function getCachedSettings(fetcher) {
  if (isFresh(cache.settings, SETTINGS_TTL_MS)) {
    return { settings: cache.settings.data, fromCache: true };
  }

  if (cache._inflight.settings) return cache._inflight.settings;

  cache._inflight.settings = fetcher()
    .then((settings) => {
      cache.settings = { data: settings, timestamp: Date.now() };
      return { settings, fromCache: false };
    })
    .finally(() => { cache._inflight.settings = null; });

  return cache._inflight.settings;
}

// Call after saving general settings (parking name, capacity, etc.)
export function invalidateSettingsCache() {
  cache.settings.timestamp = 0;
}

// Active + Lost ticket lists
// Fetcher signature: async () => { activeTickets: [], lostTickets: [] }
// Separate from dashboard lostTickets so both pages can cache independently.
export async function getCachedActiveTickets(fetcher, force = false) {
  const activeFresh = isFresh(cache.activeTickets, ACTIVE_TICKETS_TTL_MS);
  const lostFresh   = isFresh(cache.lostActive,    ACTIVE_TICKETS_TTL_MS);

  if (!force && activeFresh && lostFresh) {
    return {
      activeTickets: cache.activeTickets.data,
      lostTickets:   cache.lostActive.data,
      fromCache: true,
    };
  }

  if (cache._inflight.activeTickets) return cache._inflight.activeTickets;

  cache._inflight.activeTickets = fetcher()
    .then(({ activeTickets, lostTickets }) => {
      cache.activeTickets = { data: activeTickets, timestamp: Date.now() };
      cache.lostActive    = { data: lostTickets,   timestamp: Date.now() };
      return { activeTickets, lostTickets, fromCache: false };
    })
    .finally(() => { cache._inflight.activeTickets = null; });

  return cache._inflight.activeTickets;
}

// Call after any ticket mutation (markLost, delete) so the next fetch is fresh
export function invalidateActiveTicketsCache() {
  cache.activeTickets.timestamp = 0;
  cache.lostActive.timestamp    = 0;
}