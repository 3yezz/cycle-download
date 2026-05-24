const { createElement: h, useState, useEffect, useCallback, useMemo, useRef, Component } = React;
const APP_VERSION = '1.0.5';
const API = 'https://e-d.fr';
const RELEASE_MANIFEST_URL = `https://e-d.fr/cycle/releases.json?date=${Date.now()}`;
const DOWNLOAD_FALLBACK_URL = 'https://github.com/3yezz/cycle-download/releases/latest';
const DOWNLOAD_LABELS = {
  android: "Télécharger l'APK Android",
  windows: 'Télécharger pour Windows',
  mac: 'Télécharger pour macOS',
  linux: 'Télécharger pour Ubuntu',
};
const STORAGE_KEY = 'edcycle_data';
const AUTH_TOKEN_KEY = 'org_token';
const AUTH_USER_KEY = 'org_user';

function getCookieToken() {
  return document.cookie.split(';').reduce((a, c) => {
    const [k, ...v] = c.trim().split('=');
    return k === 'token' ? decodeURIComponent(v.join('=')) : a;
  }, null);
}

function decodeJWT(t) {
  try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return null; }
}

function isOnlineToken(t) {
  return !!t && t !== 'offline';
}

function isElectronRuntime() {
  return !!(window.edcycleRuntime && window.edcycleRuntime.isElectron) || /Electron/i.test(navigator.userAgent || '');
}

function getRuntimePlatform() {
  const ua = navigator.userAgent || '';
  const electronPlatform = window.edcycleRuntime && window.edcycleRuntime.platform;
  if (window.EDcycle || /android/i.test(ua)) return 'android';
  if (isElectronRuntime() && electronPlatform) {
    if (electronPlatform === 'win32') return 'windows';
    if (electronPlatform === 'darwin') return 'mac';
    if (electronPlatform === 'linux') return 'linux';
  }
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/mac/i.test(navigator.platform || '') || /mac os x/i.test(ua)) return 'mac';
  if (/linux|ubuntu|x11/i.test(navigator.platform || '') || /linux|ubuntu/i.test(ua)) return 'linux';
  return 'windows';
}

async function fetchReleaseManifest() {
  const urls = [...new Set([
    /^https?:/.test(window.location.protocol) ? new URL(`./releases.json?date=${Date.now()}`, window.location.href).href : null,
    RELEASE_MANIFEST_URL,
    `./releases.json?date=${Date.now()}`,
  ].filter(Boolean))];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      return await res.json();
    } catch {}
  }
  return null;
}

function dataStorageKey(userId) {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

const iconSvg = (paths, props = {}) => h('svg', {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  width: props.size || 20,
  height: props.size || 20,
  className: props.className || '',
  style: props.style || null,
  'aria-hidden': 'true',
}, ...paths);

const Icon = {
  alert: (p) => iconSvg([h('path', { d: 'M10.3 4.1 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z' }), h('path', { d: 'M12 9v4' }), h('path', { d: 'M12 17h.01' })], p),
  calendar: (p) => iconSvg([h('rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }), h('path', { d: 'M16 2v4' }), h('path', { d: 'M8 2v4' }), h('path', { d: 'M3 10h18' })], p),
  chart: (p) => iconSvg([h('path', { d: 'M3 3v18h18' }), h('rect', { x: 7, y: 12, width: 3, height: 5 }), h('rect', { x: 12, y: 8, width: 3, height: 9 }), h('rect', { x: 17, y: 5, width: 3, height: 12 })], p),
  check: (p) => iconSvg([h('path', { d: 'm20 6-11 11-5-5' })], p),
  download: (p) => iconSvg([h('path', { d: 'M12 3v12' }), h('path', { d: 'm7 10 5 5 5-5' }), h('path', { d: 'M5 21h14' })], p),
  droplet: (p) => iconSvg([h('path', { d: 'M12 2.5s6 6.2 6 11.1a6 6 0 0 1-12 0c0-4.9 6-11.1 6-11.1Z' })], p),
  edit: (p) => iconSvg([h('path', { d: 'M12 20h9' }), h('path', { d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' })], p),
  flag: (p) => iconSvg([h('path', { d: 'M5 22V4' }), h('path', { d: 'M5 4h11l-1 4 1 4H5' })], p),
  flower: (p) => iconSvg([h('circle', { cx: 12, cy: 12, r: 2 }), h('path', { d: 'M12 2c2 3 2 5 0 8-2-3-2-5 0-8Z' }), h('path', { d: 'M12 22c-2-3-2-5 0-8 2 3 2 5 0 8Z' }), h('path', { d: 'M2 12c3-2 5-2 8 0-3 2-5 2-8 0Z' }), h('path', { d: 'M22 12c-3 2-5 2-8 0 3-2 5-2 8 0Z' })], p),
  headache: (p) => iconSvg([h('path', { d: 'M9 18h6' }), h('path', { d: 'M8 14h.01' }), h('path', { d: 'M16 14h.01' }), h('path', { d: 'M7 9a5 5 0 0 1 10 0c0 3-2 4-2 7H9c0-3-2-4-2-7Z' }), h('path', { d: 'M4 4 2.5 2.5' }), h('path', { d: 'M20 4l1.5-1.5' })], p),
  heart: (p) => iconSvg([h('path', { d: 'M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z' })], p),
  home: (p) => iconSvg([h('path', { d: 'm3 11 9-8 9 8' }), h('path', { d: 'M5 10v10h14V10' }), h('path', { d: 'M9 20v-6h6v6' })], p),
  leaf: (p) => iconSvg([h('path', { d: 'M20 4C11 4 5 9 5 17a3 3 0 0 0 3 3c8 0 12-7 12-16Z' }), h('path', { d: 'M5 19c3-6 7-9 13-11' })], p),
  moon: (p) => iconSvg([h('path', { d: 'M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z' })], p),
  monitor: (p) => iconSvg([h('rect', { x: 3, y: 4, width: 18, height: 13, rx: 2 }), h('path', { d: 'M8 21h8' }), h('path', { d: 'M12 17v4' })], p),
  note: (p) => iconSvg([h('path', { d: 'M4 4h11l5 5v11H4Z' }), h('path', { d: 'M15 4v5h5' }), h('path', { d: 'M8 13h8' }), h('path', { d: 'M8 17h6' })], p),
  pain: (p) => iconSvg([h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 7v5' }), h('path', { d: 'M12 16h.01' })], p),
  pill: (p) => iconSvg([h('path', { d: 'm10.5 21 10-10a5 5 0 0 0-7-7l-10 10a5 5 0 0 0 7 7Z' }), h('path', { d: 'm8.5 8.5 7 7' })], p),
  settings: (p) => iconSvg([h('path', { d: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z' }), h('path', { d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z' })], p),
  sparkle: (p) => iconSvg([h('path', { d: 'M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8Z' }), h('path', { d: 'm19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z' }), h('path', { d: 'm5 14 .7 2L8 17l-2.3.8L5 20l-.8-2.2L2 17l2.2-.8Z' })], p),
  sun: (p) => iconSvg([h('circle', { cx: 12, cy: 12, r: 4 }), h('path', { d: 'M12 2v2' }), h('path', { d: 'M12 20v2' }), h('path', { d: 'm4.9 4.9 1.4 1.4' }), h('path', { d: 'm17.7 17.7 1.4 1.4' }), h('path', { d: 'M2 12h2' }), h('path', { d: 'M20 12h2' }), h('path', { d: 'm4.9 19.1 1.4-1.4' }), h('path', { d: 'm17.7 6.3 1.4-1.4' })], p),
  trash: (p) => iconSvg([h('path', { d: 'M3 6h18' }), h('path', { d: 'M8 6V4h8v2' }), h('path', { d: 'm19 6-1 14H6L5 6' }), h('path', { d: 'M10 11v5' }), h('path', { d: 'M14 11v5' })], p),
  upload: (p) => iconSvg([h('path', { d: 'M12 15V3' }), h('path', { d: 'm7 8 5-5 5 5' }), h('path', { d: 'M5 21h14' })], p),
  user: (p) => iconSvg([h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }), h('circle', { cx: 12, cy: 7, r: 4 })], p),
  waves: (p) => iconSvg([h('path', { d: 'M3 8c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2' }), h('path', { d: 'M3 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2' }), h('path', { d: 'M3 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2' })], p),
};

const inlineIcon = (icon, text) => h('span', { className: 'with-icon' }, icon, text);

function DownloadAppButton({ compact = false }) {
  if (isElectronRuntime() || window.EDcycle) return null;

  const [target, setTarget] = useState(() => {
    const platform = getRuntimePlatform();
    if (platform === 'ios') return { label: 'Disponible sur ordinateur ou Android', href: '#', disabled: true };
    return { label: DOWNLOAD_LABELS[platform] || 'Télécharger', href: DOWNLOAD_FALLBACK_URL };
  });

  useEffect(() => {
    const platform = getRuntimePlatform();
    if (platform === 'ios') return;
    fetchReleaseManifest().then(manifest => {
      const asset = manifest?.assets?.[platform];
      if (!asset?.url) return;
      setTarget({ label: asset.label || DOWNLOAD_LABELS[platform] || 'Télécharger', href: asset.url });
    });
  }, []);

  return h('a', {
    className: `download-app-btn${compact ? ' compact' : ''}${target.disabled ? ' disabled' : ''}`,
    href: target.href,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-disabled': target.disabled ? 'true' : null,
    onClick: target.disabled ? e => e.preventDefault() : null,
    title: target.label
  }, Icon.download({ size: 16 }), h('span', null, target.label));
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return h('div', { style: { padding: '40px 20px', textAlign: 'center', fontFamily: 'system-ui,sans-serif' } },
        h('div', { style: { fontSize: '40px', marginBottom: '16px', display: 'flex', justifyContent: 'center' } }, Icon.alert({ size: 40 })),
        h('div', { style: { fontSize: '18px', fontWeight: 700, marginBottom: '8px' } }, 'Erreur de chargement'),
        h('pre', { style: { fontSize: '12px', color: '#666', whiteSpace: 'pre-wrap', textAlign: 'left', background: '#f5f5f5', padding: '12px', borderRadius: '8px', maxWidth: '600px', margin: '0 auto' } },
          String(this.state.error)
        )
      );
    }
    return this.props.children;
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────
function defaultData() {
  return {
    cycles: [],
    pill: {
      enabled: false,
      type: 'contraceptive', // 'contraceptive' | 'hormonal' | 'endometriose'
      name: '',
      time: '08:00',
      startDate: '',
      packDays: 21,
      pauseDays: 7,
    },
    pillLog: {},
    symptoms: {},
    settings: { theme: 'system', cycleLength: 28, periodLength: 5 },
  };
}

function mergeData(parsed) {
  const d = defaultData();
  return { ...d, ...parsed, pill: { ...d.pill, ...(parsed.pill || {}) }, symptoms: { ...d.symptoms, ...(parsed.symptoms || {}) }, settings: { ...d.settings, ...(parsed.settings || {}) } };
}

function loadData(userId) {
  try {
    const key = dataStorageKey(userId);
    let raw = localStorage.getItem(key);
    const hasProfileData = Object.keys(localStorage).some(k => k.startsWith(STORAGE_KEY + '_'));
    if (!raw && userId && !hasProfileData && localStorage.getItem(STORAGE_KEY)) {
      raw = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(key, raw);
    }
    if (!raw) return defaultData();
    return mergeData(JSON.parse(raw));
  } catch { return defaultData(); }
}

function saveData(data, userId) {
  try { localStorage.setItem(dataStorageKey(userId), JSON.stringify(data)); } catch {}
}

// ── Date utils ────────────────────────────────────────────────────────────────
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_SHORT = ['Lu','Ma','Me','Je','Ve','Sa','Di'];

function toYMD(d) { return d.toISOString().split('T')[0]; }
function todayStr() { return toYMD(new Date()); }
function nowTime() { const n = new Date(); return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`; }

function addDays(s, n) {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

function diffDays(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
}

function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function getFirstWeekday(y, m) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function isBetween(d, start, end) { return d >= start && d <= end; }

// ── Cycle logic ───────────────────────────────────────────────────────────────
function getActiveCycle(cycles) {
  return cycles.find(c => c.start && !c.end) || null;
}

function computeAvgCycleLen(cycles, fallback) {
  const done = cycles.filter(c => c.start && c.end).sort((a, b) => a.start.localeCompare(b.start));
  if (done.length < 2) return fallback;
  const recent = done.slice(-6);
  const lens = [];
  for (let i = 1; i < recent.length; i++) lens.push(diffDays(recent[i-1].start, recent[i].start));
  return Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
}

function computeAvgPeriodLen(cycles, fallback) {
  const done = cycles.filter(c => c.start && c.end);
  if (!done.length) return fallback;
  const lens = done.map(c => diffDays(c.start, c.end) + 1);
  return Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
}

function predictNextPeriod(cycles, settings) {
  const done = cycles.filter(c => c.start && c.end).sort((a, b) => b.start.localeCompare(a.start));
  if (!done.length) return null;
  const avg = computeAvgCycleLen(cycles, settings.cycleLength);
  return addDays(done[0].start, avg);
}

function getCyclePhase(cycles, settings) {
  const t = todayStr();
  const active = getActiveCycle(cycles);
  if (active) return 'menstruation';

  const done = cycles.filter(c => c.start && c.end).sort((a, b) => b.start.localeCompare(a.start));
  if (!done.length) return 'unknown';

  const last = done[0];
  const daysSince = diffDays(last.start, t);
  if (daysSince < 0) return 'unknown';

  const cycLen = computeAvgCycleLen(cycles, settings.cycleLength);
  const periLen = computeAvgPeriodLen(cycles, settings.periodLength);
  const ovDay = Math.round(cycLen / 2);

  if (daysSince < periLen) return 'menstruation';
  if (daysSince < ovDay - 2) return 'folliculaire';
  if (daysSince < ovDay + 3) return 'ovulation';
  return 'luteale';
}

function getCycleDayNum(cycles, settings) {
  const t = todayStr();
  const active = getActiveCycle(cycles);
  if (active) return diffDays(active.start, t) + 1;
  const done = cycles.filter(c => c.start && c.end).sort((a, b) => b.start.localeCompare(a.start));
  if (!done.length) return null;
  const daysSince = diffDays(done[0].start, t);
  if (daysSince < 0) return null;
  return daysSince + 1;
}

const PHASE_INFO = {
  menstruation: { label: 'Menstruation', icon: Icon.droplet },
  folliculaire:  { label: 'Phase folliculaire', icon: Icon.leaf },
  ovulation:     { label: 'Ovulation', icon: Icon.flower },
  luteale:       { label: 'Phase lutéale', icon: Icon.moon },
  unknown:       { label: 'Non suivi', icon: Icon.sparkle },
};

// ── Pill logic ────────────────────────────────────────────────────────────────
function getPillDayInfo(pill, pillLog, dateStr) {
  if (!pill.enabled || !pill.startDate) return { type: 'off' };
  const dayN = diffDays(pill.startDate, dateStr);
  if (dayN < 0) return { type: 'off' };
  if (pill.type === 'endometriose' || pill.type === 'hormonal') {
    return { type: 'active', dayNum: dayN + 1, taken: !!(pillLog[dateStr]?.taken) };
  }
  const cycleLen = pill.packDays + (pill.pauseDays || 0);
  const dayInCycle = dayN % cycleLen;
  if (dayInCycle < pill.packDays) {
    return { type: 'active', dayNum: dayInCycle + 1, taken: !!(pillLog[dateStr]?.taken) };
  }
  return { type: 'pause', dayNum: dayInCycle - pill.packDays + 1 };
}

function getPillStreak(pill, pillLog) {
  if (!pill.enabled || !pill.startDate) return 0;
  let streak = 0;
  let d = todayStr();
  for (let i = 0; i < 365; i++) {
    const info = getPillDayInfo(pill, pillLog, d);
    if (info.type === 'off') break;
    if (info.type === 'pause') { d = addDays(d, -1); continue; }
    if (!info.taken) break;
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

function countMissedThisMonth(pill, pillLog) {
  if (!pill.enabled || !pill.startDate) return 0;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const firstDay = `${y}-${String(m+1).padStart(2,'0')}-01`;
  const today = todayStr();
  let missed = 0;
  let d = firstDay;
  while (d <= today) {
    const info = getPillDayInfo(pill, pillLog, d);
    if (info.type === 'active' && !info.taken && d < today) missed++;
    d = addDays(d, 1);
  }
  return missed;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'system') {
    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
  } else {
    html.setAttribute('data-theme', theme);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('local');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ id: '', pwd: '', user: '', email: '', phone: '', rpwd: '', localName: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const localLogin = (saved) => {
    setErr('');
    const name = saved?.username || form.localName.trim();
    if (!name) { setErr('Entrez un pseudo pour continuer.'); return; }
    if (name.length < 2) { setErr('Le pseudo doit faire au moins 2 caracteres.'); return; }
    const id = saved?.id || ('local_' + name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, ''));
    onLogin('offline', { id, username: name, email: '', alias: name + '#local', avatar: '' });
  };

  const login = async () => {
    setErr('');
    if (!form.id || !form.pwd) { setErr('Remplissez tous les champs.'); return; }
    setBusy(true);
    try {
      const isEmail = form.id.includes('@');
      const body = isEmail ? { email: form.id, password: form.pwd } : { username: form.id, password: form.pwd };
      const res = await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.message || data.error || 'Identifiants invalides');
      onLogin(data.token, data.user);
    } catch (e) {
      setErr(e.name === 'TypeError' ? 'Serveur inaccessible. Essayez le mode local.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    setErr('');
    if (!form.user || !form.email || !form.rpwd) { setErr('Les champs * sont obligatoires.'); return; }
    if (form.rpwd.length < 6) { setErr('Mot de passe trop court (min 6 caracteres).'); return; }
    setBusy(true);
    try {
      const res = await fetch(API + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.user, email: form.email, password: form.rpwd, phone: form.phone || undefined })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur inscription');
      onLogin(data.token, data.user);
    } catch (e) {
      setErr(e.name === 'TypeError' ? 'Serveur inaccessible. Vous pouvez continuer en local.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const savedLocal = (() => {
    try {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(STORAGE_KEY + '_local_'))
        .map(k => {
          const id = k.slice((STORAGE_KEY + '_').length);
          const name = id.replace(/^local_/, '').replace(/_/g, ' ');
          return { id, username: name.charAt(0).toUpperCase() + name.slice(1) };
        });
    } catch { return []; }
  })();

  const Field = (label, id, type, placeholder, autoComplete, inputMode, onEnter) =>
    h('div', { className: 'auth-field' },
      h('label', null, label),
      h('input', {
        className: 'auth-input', type, placeholder, autoComplete, inputMode,
        value: form[id], onChange: e => set(id, e.target.value),
        onKeyDown: e => { if (e.key === 'Enter' && onEnter) onEnter(); }
      })
    );

  return h('div', { className: 'auth-screen' },
    h('img',{src:"logo.png",style:{width:"100px"}}),
    h('div', { className: 'auth-h1' }, 'Cycle'),
    h('div', { className: 'auth-sub' }, 'Cycle · Pilule · Suivi personnel'),
    h('div', { className: 'auth-card' },
      h('div', { className: 'auth-tabs' },
        h('button', { className: 'auth-tab' + (tab === 'local' ? ' active' : ''), onClick: () => { setTab('local'); setErr(''); } }, 'Local'),
        h('button', { className: 'auth-tab' + (tab === 'login' ? ' active' : ''), onClick: () => { setTab('login'); setErr(''); } }, 'Connexion'),
        h('button', { className: 'auth-tab' + (tab === 'register' ? ' active' : ''), onClick: () => { setTab('register'); setErr(''); } }, 'Inscription')
      ),
      err && h('div', { className: 'auth-err' }, err),
      tab === 'local' && h('div', null,
        h('div', { className: 'auth-local-info' }, 'Aucun compte requis. Vos donnees restent uniquement sur cet appareil.'),
        h('div', { className: 'auth-field' },
          h('label', null, 'Votre pseudo'),
          h('input', { className: 'auth-input', type: 'text', placeholder: 'ex : Alice', autoComplete: 'nickname', autoFocus: true, value: form.localName, onChange: e => set('localName', e.target.value), onKeyDown: e => { if (e.key === 'Enter') localLogin(); } })
        ),
        savedLocal.length > 0 && h('div', { className: 'auth-saved-wrap' },
          h('div', { className: 'auth-saved-label' }, 'Continuer en tant que...'),
          h('div', { className: 'auth-saved-list' }, savedLocal.map(u =>
            h('button', { key: u.id, className: 'auth-saved-btn', onClick: () => localLogin(u) }, u.username)
          ))
        ),
        h('button', { className: 'auth-btn', onClick: () => localLogin() }, 'Continuer')
      ),
      tab === 'login' && h('div', null,
        Field('Email ou nom d utilisateur', 'id', 'text', 'alice@mail.com', 'username', 'email', () => document.querySelector('#cycle-pwd')?.focus()),
        h('div', { className: 'auth-field' }, h('label', null, 'Mot de passe'), h('input', { id: 'cycle-pwd', className: 'auth-input', type: 'password', placeholder: 'Mot de passe', autoComplete: 'current-password', value: form.pwd, onChange: e => set('pwd', e.target.value), onKeyDown: e => { if (e.key === 'Enter') login(); } })),
        h('button', { className: 'auth-btn', disabled: busy, onClick: login }, busy ? 'Connexion...' : 'Se connecter')
      ),
      tab === 'register' && h('div', null,
        Field('Nom d utilisateur *', 'user', 'text', 'alice', 'username', 'text', () => document.querySelector('#cycle-email')?.focus()),
        h('div', { className: 'auth-field' }, h('label', null, 'Email *'), h('input', { id: 'cycle-email', className: 'auth-input', type: 'email', placeholder: 'alice@mail.com', autoComplete: 'email', inputMode: 'email', value: form.email, onChange: e => set('email', e.target.value), onKeyDown: e => { if (e.key === 'Enter') document.querySelector('#cycle-rpwd')?.focus(); } })),
        h('div', { className: 'auth-field' }, h('label', null, 'Mot de passe *'), h('input', { id: 'cycle-rpwd', className: 'auth-input', type: 'password', placeholder: 'Min. 6 caracteres', autoComplete: 'new-password', value: form.rpwd, onChange: e => set('rpwd', e.target.value), onKeyDown: e => { if (e.key === 'Enter') register(); } })),
        h('button', { className: 'auth-btn', disabled: busy, onClick: register }, busy ? 'Creation...' : 'Creer mon compte')
      )
    ),
    h('div', { className: 'auth-download-wrap auth-download-wrap-auth' }, h(DownloadAppButton)),
    h('div', { className: 'auth-note' }, 'Local ou compte e-d, chaque profil garde ses propres donnees')
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────
function TopBar({ tab, theme, onThemeToggle, setTab }) {
  const TAB_LABELS = { home: 'Accueil', cycle: 'Règles & Cycle', pill: 'Pilule', stats: 'Statistiques', settings: 'Réglages', account: 'Mon compte' };
  const themeIcon = theme === 'dark' ? Icon.sun({ size: 18 }) : theme === 'light' ? Icon.moon({ size: 18 }) : Icon.monitor({ size: 18 });
  return h('div', { className: 'topbar' },
    h('div', { className: 'topbar-title' }, TAB_LABELS[tab] || 'EDcycle'),
    h('div', { className: 'topbar-btn', onClick: onThemeToggle, title: 'Changer le thème' }, themeIcon),
    h('div', { className: 'topbar-btn', onClick: () => setTab('account'), title: 'Compte' }, Icon.user({ size: 18 }))
  );
}

// ── SideNav ───────────────────────────────────────────────────────────────────
function SideNav({ tab, setTab }) {
  const items = [
    { id: 'home',     icon: Icon.home, label: 'Accueil' },
    { id: 'cycle',    icon: Icon.droplet, label: 'Règles' },
    { id: 'pill',     icon: Icon.pill, label: 'Pilule' },
    { id: 'stats',    icon: Icon.chart, label: 'Statistiques' },
    { id: 'settings', icon: Icon.settings, label: 'Régl.' },
    { id: 'account',  icon: Icon.user, label: 'Compte' },
  ];
  return h('div', { className: 'sidebar' },
    h('div', { className: 'sidebar-brand' },
      h('img',{src:"logo.png",style:{width:"40px"}}),
      h('div', { className: 'sidebar-title' }, 'Cycle')
    ),
    items.map(it =>
      h('div', {
        key: it.id,
        className: `nav-item${tab === it.id ? ' active' : ''}`,
        onClick: () => setTab(it.id),
      },
        h('span', { className: 'nav-icon' }, it.icon({ size: 18 })),
        h('span', null, it.label)
      )
    ),
    h('div', { className: 'nav-spacer' }),
    h('div', { className: 'nav-item', style: { fontSize: '11px', color: 'var(--text-tertiary)' } }, `v${APP_VERSION}`)
  );
}

// ── BottomNav ─────────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'home',     icon: Icon.home, label: 'Accueil' },
    { id: 'cycle',    icon: Icon.droplet, label: 'Règles' },
    { id: 'pill',     icon: Icon.pill, label: 'Pilule' },
    { id: 'stats',    icon: Icon.chart, label: 'Stats' },
    { id: 'settings', icon: Icon.settings, label: 'Régl.' },
    { id: 'account',  icon: Icon.user, label: 'Compte' },
  ];
  return h('div', { className: 'bottom-nav' },
    h('div', { className: 'bottom-nav-items' },
      items.map(it =>
        h('div', {
          key: it.id,
          className: `bottom-nav-item${tab === it.id ? ' active' : ''}`,
          onClick: () => setTab(it.id),
        },
          h('span', { className: 'nav-icon' }, it.icon({ size: 21 })),
          h('span', { className: 'nav-label' }, it.label)
        )
      )
    )
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═════════════════════════════════════════════════════════════════════════════
function DashboardTab({ data, onUpdate, setTab }) {
  const { cycles, pill, pillLog, settings, symptoms = {} } = data;
  const today = todayStr();
  const [symptomDay, setSymptomDay] = useState(null);
  const phase = getCyclePhase(cycles, settings);
  const phaseInfo = PHASE_INFO[phase];
  const cycleDay = getCycleDayNum(cycles, settings);
  const nextPeriod = predictNextPeriod(cycles, settings);
  const daysUntilNext = nextPeriod ? diffDays(today, nextPeriod) : null;
  const activeCycle = getActiveCycle(cycles);
  const pillInfo = getPillDayInfo(pill, pillLog, today);
  const streak = getPillStreak(pill, pillLog);

  const avgCycleLen = computeAvgCycleLen(cycles, settings.cycleLength);
  const avgPeriodLen = computeAvgPeriodLen(cycles, settings.periodLength);

  function markPillToday() {
    if (pillInfo.type !== 'active') return;
    const already = pillLog[today]?.taken;
    const newLog = { ...pillLog, [today]: { taken: !already, takenAt: nowTime() } };
    onUpdate({ ...data, pillLog: newLog });
  }

  function saveQuickSymptom(sym) {
    onUpdate({ ...data, symptoms: { ...(symptoms || {}), [symptomDay || today]: sym } });
    setSymptomDay(null);
  }

  return h('div', { className: 'tab-content' },
    // Hero phase card
    h('div', { className: 'dash-hero' },
      h('div', { className: 'dash-phase-emoji' }, phaseInfo.icon({ size: 38 })),
      h('div', { className: 'dash-phase-label' }, 'Phase actuelle'),
      h('div', { className: 'dash-phase-name' }, phaseInfo.label),
      cycleDay && h('div', { className: 'dash-cycle-day' }, `Jour ${cycleDay} du cycle`),
      nextPeriod && !activeCycle && h('div', { className: 'dash-next' },
        daysUntilNext > 0
          ? h('span', null, `Prochaines règles dans `, h('strong', null, `${daysUntilNext} jours`), ` (${fmtDate(nextPeriod)})`)
          : daysUntilNext === 0
            ? h('span', null, 'Prochaines règles ', h('strong', null, "aujourd'hui"))
            : h('span', null, 'Règles attendues depuis ', h('strong', null, `${-daysUntilNext} jours`))
      ),
      activeCycle && h('div', { className: 'dash-next' },
        inlineIcon(Icon.droplet({ size: 16 }), h(React.Fragment, null, 'Règles en cours depuis ', h('strong', null, `${diffDays(activeCycle.start, today) + 1} jours`)))
      )
    ),

    // Stat grid
    h('div', { className: 'stat-grid' },
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num' }, cycles.filter(c => c.end).length),
        h('div', { className: 'stat-card-label' }, 'Cycles enregistrés')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num' }, avgCycleLen),
        h('div', { className: 'stat-card-label' }, 'Durée moy. du cycle')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num' }, avgPeriodLen),
        h('div', { className: 'stat-card-label' }, 'Durée moy. des règles')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num' }, pill.enabled ? streak : '—'),
        h('div', { className: 'stat-card-label' }, 'Streak pilule (jours)')
      )
    ),

    // Pill today card
    pill.enabled && h('div', { className: 'pill-today-card', onClick: markPillToday },
      h('div', { className: 'pill-today-icon' }, Icon.pill({ size: 28 })),
      h('div', { className: 'pill-today-info' },
        h('div', { className: 'pill-today-name' }, pill.name || 'Pilule du jour'),
        h('div', { className: 'pill-today-sub' },
          pillInfo.type === 'active'
            ? `À prendre à ${pill.time}${pillInfo.taken ? ` · Prise à ${pillLog[today]?.takenAt || pill.time}` : ''}`
            : pillInfo.type === 'pause'
              ? `Jour de pause (j${pillInfo.dayNum})`
              : 'Traitement non commencé'
        )
      ),
      pillInfo.type === 'active'
        ? h('div', { className: `pill-today-status ${pillInfo.taken ? 'pill-taken' : 'pill-not-taken'}` },
            pillInfo.taken ? inlineIcon(Icon.check({ size: 14 }), 'Prise') : 'À prendre')
        : pillInfo.type === 'pause'
          ? h('div', { className: 'pill-today-status pill-pause-badge' }, 'Pause')
          : null
    ),

    !pill.enabled && h('div', { className: 'card', style: { cursor: 'pointer' }, onClick: () => setTab('pill') },
      h('div', { className: 'card-title' }, 'Pilule'),
      h('div', { style: { fontSize: '13px', color: 'var(--text-secondary)' } },
        inlineIcon(Icon.pill({ size: 17 }), 'Configurez votre traitement pour le suivre ici ->')
      )
    ),

    // Quick actions
    h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Actions rapides'),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        activeCycle
          ? h('button', {
              className: 'btn btn-secondary btn-sm',
              onClick: () => setTab('cycle'),
            }, inlineIcon(Icon.flag({ size: 15 }), 'Terminer les règles'))
          : h('button', {
              className: 'btn btn-primary btn-sm',
              onClick: () => setTab('cycle'),
            }, inlineIcon(Icon.droplet({ size: 15 }), 'Démarrer les règles')),
        pill.enabled && pillInfo.type === 'active' && !pillInfo.taken
          && h('button', {
              className: 'btn btn-secondary btn-sm',
              onClick: markPillToday,
            }, inlineIcon(Icon.pill({ size: 15 }), 'Marquer prise')),
        h('button', {
          className: 'btn btn-secondary btn-sm',
          onClick: () => setSymptomDay(today),
        }, inlineIcon(Icon.pain({ size: 15 }), 'Ajouter une crise')),
        h('button', { className: 'btn btn-secondary btn-sm', onClick: () => setTab('cycle') }, inlineIcon(Icon.calendar({ size: 15 }), 'Voir le calendrier'))
      )
    ),

    symptomDay && h(SymptomModal, {
      dateStr: symptomDay,
      symptom: symptoms?.[symptomDay] || {},
      onSave: saveQuickSymptom,
      onClose: () => setSymptomDay(null),
    })
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SYMPTOM MODAL
// ═════════════════════════════════════════════════════════════════════════════
const DEFAULT_SYMPTOM = {
  pain: 0,
  painDuration: '',
  painMedication: '',
  painRelief: 'unknown',
  mood: 'normal',
  flow: 'none',
  impact: 'none',
  endoFlare: false,
  pelvicPain: false,
  ovarianLeft: false,
  ovarianRight: false,
  legSciatica: false,
  rectalPain: false,
  bladderPain: false,
  urinationPain: false,
  urinaryFrequency: false,
  bowelPain: false,
  constipation: false,
  dyspareunia: false,
  postSexPain: false,
  fatigueLevel: 0,
  bloating: false,
  headache: false,
  nausea: false,
  vomiting: false,
  diarrhea: false,
  cramps: false,
  breastTenderness: false,
  fatigue: false,
  dizziness: false,
  backPain: false,
  acne: false,
  appetite: false,
  notes: ''
};
const PAIN_LABELS = ['Aucune', 'Légère', 'Modérée', 'Forte', 'Intense'];
const FATIGUE_LABELS = ['Aucune', 'Légère', 'Modérée', 'Forte', 'Épuisée'];
const MOOD_OPTIONS = [
  { v: 'great',    l: 'Bien' },
  { v: 'normal',   l: 'Normale' },
  { v: 'bad',      l: 'Triste' },
  { v: 'irritable',l: 'Irritable' },
  { v: 'anxious',  l: 'Anxieuse' },
];
const FLOW_OPTIONS = [
  { v: 'none',       l: 'Aucun' },
  { v: 'light',      l: 'Léger' },
  { v: 'medium',     l: 'Moyen' },
  { v: 'heavy',      l: 'Abondant' },
  { v: 'very-heavy', l: 'Très abondant' },
];
const IMPACT_OPTIONS = [
  { v: 'none', l: 'Aucun' },
  { v: 'rest', l: 'Repos nécessaire' },
  { v: 'limited', l: 'Activité limitée' },
  { v: 'stopped', l: 'Travail/école stoppé' },
  { v: 'medical', l: 'Aide médicale' },
];
const RELIEF_OPTIONS = [
  { v: 'unknown', l: 'Non noté' },
  { v: 'none', l: 'Aucun' },
  { v: 'partial', l: 'Partiel' },
  { v: 'good', l: 'Bon' },
];
const ENDO_PAIN_AREAS = [
  { key: 'pelvicPain', label: 'Douleur pelvienne', icon: Icon.pain },
  { key: 'ovarianLeft', label: 'Ovaire gauche', icon: Icon.pain },
  { key: 'ovarianRight', label: 'Ovaire droit', icon: Icon.pain },
  { key: 'legSciatica', label: 'Jambe / sciatique', icon: Icon.pain },
  { key: 'rectalPain', label: 'Rectum / périnée', icon: Icon.pain },
  { key: 'bladderPain', label: 'Vessie', icon: Icon.waves },
];
const URINARY_INTIMATE_SYMPTOMS = [
  { key: 'urinationPain', label: 'Douleur en urinant', icon: Icon.waves },
  { key: 'urinaryFrequency', label: 'Envies fréquentes', icon: Icon.waves },
  { key: 'bowelPain', label: 'Douleur à la selle', icon: Icon.waves },
  { key: 'constipation', label: 'Constipation', icon: Icon.waves },
  { key: 'dyspareunia', label: 'Rapport douloureux', icon: Icon.heart },
  { key: 'postSexPain', label: 'Douleur après rapport', icon: Icon.heart },
];
const DIGESTIVE_SYMPTOMS = [
  { key: 'nausea', label: 'Nausées', icon: Icon.waves },
  { key: 'vomiting', label: 'Vomissements', icon: Icon.waves },
  { key: 'diarrhea', label: 'Diarrhée', icon: Icon.waves },
  { key: 'bloating', label: 'Ballonnements', icon: Icon.waves },
];
const BODY_SYMPTOMS = [
  { key: 'cramps', label: 'Crampes', icon: Icon.pain },
  { key: 'headache', label: 'Maux de tête', icon: Icon.headache },
  { key: 'backPain', label: 'Douleurs lombaires', icon: Icon.pain },
  { key: 'breastTenderness', label: 'Seins sensibles', icon: Icon.heart },
  { key: 'fatigue', label: 'Fatigue', icon: Icon.moon },
  { key: 'dizziness', label: 'Vertiges', icon: Icon.monitor },
  { key: 'acne', label: 'Acné', icon: Icon.sparkle },
  { key: 'appetite', label: 'Appétit inhabituel', icon: Icon.heart },
];
const ENDO_TRACKED_KEYS = [
  ...ENDO_PAIN_AREAS.map(i => i.key),
  ...URINARY_INTIMATE_SYMPTOMS.map(i => i.key),
  ...DIGESTIVE_SYMPTOMS.map(i => i.key),
  ...BODY_SYMPTOMS.map(i => i.key),
];

// ── Hook useIsMobile ──────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

// ── CustomSelect ──────────────────────────────────────────────────────────────
const CustomSelect = ({ options, value, onChange, placeholder = 'Sélectionner...', search = false }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isMobile) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const filteredOptions = search
    ? options.filter(opt => String(opt.label).toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const handleSelect = (opt) => {
    onChange(opt.value);
    if (isMobile) setIsModalOpen(false);
    else setIsOpen(false);
    setSearchTerm('');
  };

  const openSelector = () => {
    if (isMobile) setIsModalOpen(true);
    else setIsOpen(o => !o);
  };

  const renderDesktop = () =>
    h('div', { className: 'form-group custom-dropdown', ref: dropdownRef },
      h('span', { className: 'form-arrow' }, '▼'),
      h('div', { className: 'dropdown-select', onClick: openSelector }, displayLabel),
      isOpen && h('div', { className: 'dropdown-menu' },
        search && h('input', {
          type: 'text', className: 'dropdown-menu-search', placeholder: 'Rechercher...',
          value: searchTerm, onChange: ev => setSearchTerm(ev.target.value), autoFocus: true
        }),
        h('div', { className: 'dropdown-menu-inner' },
          filteredOptions.length === 0
            ? h('div', { className: 'dropdown-menu-item', style: { color: 'var(--text-tertiary)' } }, 'Aucun résultat')
            : filteredOptions.map(opt =>
                h('div', {
                  key: opt.value,
                  className: `dropdown-menu-item${String(opt.value) === String(value) ? ' is-select' : ''}`,
                  onClick: () => handleSelect(opt)
                }, opt.label)
              )
        )
      )
    );

  const renderMobile = () =>
    h(React.Fragment, null,
      h('div', { className: 'form-group custom-dropdown-mobile', onClick: openSelector },
        h('span', { className: 'form-arrow' }, '▼'),
        h('div', { className: 'dropdown-select-mobile' }, displayLabel)
      ),
      isModalOpen && h('div', { className: 'modal-overlay mobile-selector-overlay' },
        h('div', { className: 'mobile-selector-modal' },
          h('div', { className: 'mobile-selector-header' },
            h('span', { className: 'mobile-selector-title' }, 'Sélectionner'),
            h('button', { className: 'mobile-selector-close', onClick: () => setIsModalOpen(false) }, '✕')
          ),
          search && h('input', {
            type: 'text', className: 'mobile-selector-search', placeholder: 'Rechercher...',
            value: searchTerm, onChange: ev => setSearchTerm(ev.target.value), autoFocus: true
          }),
          h('div', { className: 'mobile-selector-list' },
            filteredOptions.length === 0
              ? h('div', { className: 'mobile-selector-empty' }, 'Aucun résultat')
              : filteredOptions.map(opt =>
                  h('div', {
                    key: opt.value,
                    className: `mobile-selector-item${String(opt.value) === String(value) ? ' selected' : ''}`,
                    onClick: () => handleSelect(opt)
                  }, opt.label)
                )
          )
        )
      )
    );

  return isMobile ? renderMobile() : renderDesktop();
};

// ── DatePicker ────────────────────────────────────────────────────────────────
const DP_DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DP_MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DP_DAYS_ABR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const DatePicker = ({ value, onChange, placeholder = 'Sélectionner une date...' }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  const parseDate = (v) => {
    if (!v) return null;
    const [y, m, d] = v.split('-').map(Number);
    return { y, m: m - 1, d };
  };

  const todayVal = todayStr();
  const todayP = parseDate(todayVal);
  const selP = parseDate(value);
  const [viewY, setViewY] = useState(selP?.y || todayP.y);
  const [viewM, setViewM] = useState(selP?.m ?? todayP.m);

  const displayLabel = () => {
    if (!value) return placeholder;
    const p = parseDate(value);
    const dayName = DP_DAYS_ABR[new Date(p.y, p.m, p.d).getDay()];
    return `${dayName} ${p.d} ${DP_MONTHS_FR[p.m]} ${p.y}`;
  };

  const headerDate = () => {
    if (!value) return null;
    const p = parseDate(value);
    const dayName = DP_DAYS_ABR[new Date(p.y, p.m, p.d).getDay()];
    return { year: p.y, label: `${dayName} ${p.d} ${DP_MONTHS_FR[p.m]}` };
  };

  useEffect(() => {
    if (isMobile) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); }
    else setViewM(m => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); }
    else setViewM(m => m + 1);
  };

  const selectDay = (ds) => {
    onChange(ds);
    if (isMobile) setIsModalOpen(false);
    else setIsOpen(false);
  };

  const openPicker = () => {
    if (selP) { setViewY(selP.y); setViewM(selP.m); }
    if (isMobile) setIsModalOpen(true);
    else setIsOpen(o => !o);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewY, viewM);
    const firstWd = getFirstWeekday(viewY, viewM);
    const cells = [];
    for (let i = 0; i < firstWd; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${viewY}-${String(viewM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ d, ds });
    }
    const hd = headerDate();
    return h('div', { className: 'datepicker-cal' },
      hd && h('div', { className: 'datepicker-header' },
        h('div', { className: 'datepicker-header-year' }, hd.year),
        h('div', { className: 'datepicker-header-date' }, hd.label)
      ),
      h('div', { className: 'datepicker-nav' },
        h('div', { className: 'datepicker-nav-btn', onClick: prevMonth }, '‹'),
        h('div', { className: 'datepicker-nav-month' }, `${DP_MONTHS_FR[viewM]} ${viewY}`),
        h('div', { className: 'datepicker-nav-btn', onClick: nextMonth }, '›')
      ),
      h('div', { className: 'datepicker-grid' },
        DP_DAYS_SHORT.map((d, i) => h('div', { key: i, className: 'datepicker-dow' }, d)),
        cells.map((cell, i) =>
          cell === null
            ? h('div', { key: `e${i}` })
            : h('div', {
                key: cell.ds,
                className: `datepicker-day${cell.ds === todayVal ? ' today' : ''}${cell.ds === value ? ' selected' : ''}`,
                onClick: () => selectDay(cell.ds)
              }, cell.d)
        )
      )
    );
  };

  const renderDesktop = () =>
    h('div', { className: 'form-group custom-dropdown datepicker-wrap', ref: dropdownRef },
      h('span', { className: 'form-arrow' }, '▼'),
      h('div', { className: 'dropdown-select', onClick: openPicker }, displayLabel()),
      isOpen && h('div', { className: 'dropdown-menu datepicker-menu' },
        renderCalendar()
      )
    );

  const renderMobile = () =>
    h(React.Fragment, null,
      h('div', { className: 'form-group custom-dropdown-mobile datepicker-wrap', onClick: openPicker },
        h('span', { className: 'form-arrow' }, '▼'),
        h('div', { className: 'dropdown-select-mobile' }, displayLabel())
      ),
      isModalOpen && h('div', { className: 'modal-overlay mobile-selector-overlay' },
        h('div', { className: 'mobile-selector-modal datepicker-modal' },
          renderCalendar(),
          h('div', { className: 'datepicker-modal-footer' },
            h('button', { className: 'btn btn-secondary btn-sm', onClick: () => setIsModalOpen(false) }, 'Fermer')
          )
        )
      )
    );

  return isMobile ? renderMobile() : renderDesktop();
};

function SymptomModal({ dateStr, symptom, onSave, onClose }) {
  const [s, setS] = useState(() => ({ ...DEFAULT_SYMPTOM, ...symptom }));
  const [page, setPage] = useState(0);
  const TOTAL_PAGES = 4;
  const PAGE_TITLES = ['Douleur', 'Cycle', 'Symptômes', 'Notes'];

  function upd(k, v) { setS(prev => ({ ...prev, [k]: v })); }
  const Toggle = ({ item }) =>
    h('button', {
      type: 'button',
      className: `toggle-chip${s[item.key] ? ' active' : ''}`,
      onClick: () => upd(item.key, !s[item.key])
    }, inlineIcon(item.icon({ size: 14 }), item.label));

  function renderPage0() {
    return [
      h('div', { key: 'pain', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.pain({ size: 14 }), 'Douleur')),
        h('div', { className: 'rating-row' },
          PAIN_LABELS.map((l, i) =>
            h('div', { key: i, className: `rating-btn${s.pain === i ? ' active' : ''}`, onClick: () => upd('pain', i) }, l)
          )
        )
      ),
      h('div', { key: 'endo', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.pain({ size: 14 }), 'Endométriose / crise')),
        h('div', { className: 'toggle-row' },
          h('button', { key: 'flare', type: 'button', className: `toggle-chip${s.endoFlare ? ' active' : ''}`, onClick: () => upd('endoFlare', !s.endoFlare) }, inlineIcon(Icon.alert({ size: 14 }), 'Crise endométriose')),
          ENDO_PAIN_AREAS.map(item => h(Toggle, { key: item.key, item }))
        )
      ),
      h('div', { key: 'duration', className: 'modal-section modal-grid-2' },
        h('div', null,
          h('div', { className: 'modal-section-label' }, 'Durée douleur'),
          h('input', { className: 'inp', placeholder: 'Ex : 2h, toute la journée', value: s.painDuration || '', onChange: e => upd('painDuration', e.target.value) })
        ),
        h('div', null,
          h('div', { className: 'modal-section-label' }, 'Soulagement'),
          h(CustomSelect, { options: RELIEF_OPTIONS.map(o => ({ value: o.v, label: o.l })), value: s.painRelief, onChange: v => upd('painRelief', v) })
        )
      ),
    ];
  }

  function renderPage1() {
    return [
      h('div', { key: 'flux', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.waves({ size: 14 }), 'Flux')),
        h(CustomSelect, { options: FLOW_OPTIONS.map(o => ({ value: o.v, label: o.l })), value: s.flow, onChange: v => upd('flow', v) })
      ),
      h('div', { key: 'mood', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.heart({ size: 14 }), 'Humeur')),
        h(CustomSelect, { options: MOOD_OPTIONS.map(o => ({ value: o.v, label: o.l })), value: s.mood, onChange: v => upd('mood', v) })
      ),
      h('div', { key: 'fatigue', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.moon({ size: 14 }), 'Fatigue')),
        h('div', { className: 'rating-row' },
          FATIGUE_LABELS.map((l, i) =>
            h('div', { key: i, className: `rating-btn${Number(s.fatigueLevel || 0) === i ? ' active' : ''}`, onClick: () => upd('fatigueLevel', i) }, l)
          )
        )
      ),
      h('div', { key: 'impact', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.flag({ size: 14 }), 'Impact quotidien')),
        h(CustomSelect, { options: IMPACT_OPTIONS.map(o => ({ value: o.v, label: o.l })), value: s.impact || 'none', onChange: v => upd('impact', v) })
      ),
    ];
  }

  function renderPage2() {
    return [
      h('div', { key: 'digestive', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.waves({ size: 14 }), 'Digestif')),
        h('div', { className: 'toggle-row' },
          DIGESTIVE_SYMPTOMS.map(item => h(Toggle, { key: item.key, item }))
        )
      ),
      h('div', { key: 'urinary', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.waves({ size: 14 }), 'Urinaire / intime')),
        h('div', { className: 'toggle-row' },
          URINARY_INTIMATE_SYMPTOMS.map(item => h(Toggle, { key: item.key, item }))
        )
      ),
      h('div', { key: 'body', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.headache({ size: 14 }), 'Corps')),
        h('div', { className: 'toggle-row' },
          BODY_SYMPTOMS.map(item => h(Toggle, { key: item.key, item }))
        )
      ),
    ];
  }

  function renderPage3() {
    return [
      h('div', { key: 'treatment', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.pill({ size: 14 }), 'Traitement pris pendant la crise')),
        h('input', { className: 'inp', placeholder: 'Ex : Spasfon, ibuprofène, bouillotte...', value: s.painMedication || '', onChange: e => upd('painMedication', e.target.value) })
      ),
      h('div', { key: 'notes', className: 'modal-section' },
        h('div', { className: 'modal-section-label' }, inlineIcon(Icon.note({ size: 14 }), 'Notes')),
        h('textarea', { className: 'inp', style: { resize: 'vertical', minHeight: '60px', fontSize: '13px' }, placeholder: 'Notes libres…', value: s.notes, onChange: e => upd('notes', e.target.value) })
      ),
    ];
  }

  const PAGES_FN = [renderPage0, renderPage1, renderPage2, renderPage3];

  return h('div', { className: 'modal-overlay', onClick: onClose },
    h('div', { className: 'modal-box', onClick: e => e.stopPropagation() },
      h('div', { className: 'modal-handle' }),
      h('div', { className: 'modal-title' }, `Symptômes du ${fmtDate(dateStr)}`),
      h('div', { className: 'modal-page-nav' },
        Array.from({ length: TOTAL_PAGES }, (_, i) =>
          h('button', {
            key: i,
            type: 'button',
            className: `modal-page-dot${i === page ? ' active' : ''}`,
            onClick: () => setPage(i),
            title: PAGE_TITLES[i],
          })
        )
      ),
      h('div', { className: 'modal-page-label' }, PAGE_TITLES[page]),
      h('div', { className: 'modal-page-content' }, ...PAGES_FN[page]()),
      h('div', { className: 'modal-footer' },
        page > 0
          ? h('button', { className: 'btn btn-secondary', onClick: () => setPage(p => p - 1) }, '← Précédent')
          : h('button', { className: 'btn btn-secondary', onClick: onClose }, 'Annuler'),
        page < TOTAL_PAGES - 1
          ? h('button', { className: 'btn btn-primary', onClick: () => setPage(p => p + 1) }, 'Suivant →')
          : h('button', { className: 'btn btn-primary', onClick: () => onSave(s) }, 'Enregistrer')
      )
    )
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CYCLE TAB
// ═════════════════════════════════════════════════════════════════════════════
function CycleTab({ data, onUpdate }) {
  const { cycles, pill, pillLog, settings, symptoms = {} } = data;
  const today = todayStr();
  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());
  const [symptomDay, setSymptomDay] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const activeCycle = getActiveCycle(cycles);
  const nextPeriod = predictNextPeriod(cycles, settings);
  const avgCycleLen = computeAvgCycleLen(cycles, settings.cycleLength);
  const avgPeriodLen = computeAvgPeriodLen(cycles, settings.periodLength);

  function startPeriod() {
    if (activeCycle) return;
    const id = Date.now().toString();
    onUpdate({ ...data, cycles: [...cycles, { id, start: today, end: null, symptoms: {} }] });
  }

  function endPeriod() {
    if (!activeCycle) return;
    const updated = cycles.map(c =>
      c.id === activeCycle.id ? { ...c, end: today } : c
    );
    onUpdate({ ...data, cycles: updated });
  }

  function deleteCycle(id) {
    onUpdate({ ...data, cycles: cycles.filter(c => c.id !== id) });
    setConfirmDel(null);
  }

  function openSymptom(dateStr) {
    if (dateStr > today) return;
    setSymptomDay(dateStr);
  }

  function saveSymptom(sym) {
    const cycle = activeCycle || cycles.find(c => c.start && c.end && symptomDay >= c.start && symptomDay <= c.end);
    if (cycle) {
      const updated = cycles.map(c => {
        if (c.id !== cycle.id) return c;
        return { ...c, symptoms: { ...(c.symptoms || {}), [symptomDay]: sym } };
      });
      onUpdate({ ...data, cycles: updated, symptoms: { ...(symptoms || {}), [symptomDay]: sym } });
    } else {
      onUpdate({ ...data, symptoms: { ...(symptoms || {}), [symptomDay]: sym } });
    }
    setSymptomDay(null);
  }

  // Build calendar data
  const calDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewY, viewM);
    const firstWd = getFirstWeekday(viewY, viewM);
    const cells = [];

    // Collect all period day ranges
    const periodDays = new Set();
    cycles.forEach(c => {
      if (!c.start) return;
      const end = c.end || (activeCycle && c.id === activeCycle.id ? today : null);
      if (!end) return;
      let d = c.start;
      while (d <= end) { periodDays.add(d); d = addDays(d, 1); }
    });

    // Predicted range
    const predStart = nextPeriod;
    const predEnd = predStart ? addDays(predStart, (avgPeriodLen || 5) - 1) : null;

    // Ovulation window (14 days before next period, ±2)
    let ovulStart = null, ovulEnd = null;
    if (predStart) {
      ovulStart = addDays(predStart, -(avgCycleLen - 14) || -14);
      ovulEnd = addDays(ovulStart, 4);
    }

    for (let i = 0; i < firstWd; i++) cells.push({ type: 'empty' });

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${viewY}-${String(viewM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isPeriod = periodDays.has(ds);
      const isPredicted = !isPeriod && predStart && predEnd && isBetween(ds, predStart, predEnd);
      const isOvulation = !isPeriod && ovulStart && ovulEnd && isBetween(ds, ovulStart, ovulEnd);
      const isToday = ds === today;
      const isFuture = ds > today;

      const pillInfo = pill.enabled ? getPillDayInfo(pill, pillLog, ds) : null;
      const pillTaken = pillInfo?.type === 'active' && pillInfo.taken;

      // Find symptom for this day
      let hasSymptom = !!(symptoms && symptoms[ds] && Object.keys(symptoms[ds]).length);
      cycles.forEach(c => {
        if (c.symptoms && c.symptoms[ds] && Object.keys(c.symptoms[ds]).length) hasSymptom = true;
      });

      let cls = 'cal-day';
      if (isPeriod) cls += ' period';
      else if (isPredicted) cls += ' predicted';
      else if (isOvulation) cls += ' ovulation-window';
      if (isToday) cls += ' today';
      if (isFuture) cls += ' future';
      if (pillTaken) cls += ' pill-taken-day';
      if (hasSymptom && !isPeriod) cls += ' has-symptoms';

      cells.push({ type: 'day', d, ds, cls, isPeriod, isToday, isFuture });
    }
    return cells;
  }, [viewY, viewM, cycles, symptoms, pillLog, pill, today, nextPeriod, avgCycleLen, avgPeriodLen]);

  const sortedCycles = [...cycles].sort((a, b) => b.start.localeCompare(a.start));
  const currentSymptom = symptomDay ? (() => {
    const c = cycles.find(cy => cy.symptoms && cy.symptoms[symptomDay]);
    return symptoms?.[symptomDay] || c?.symptoms[symptomDay] || {};
  })() : {};

  return h('div', { className: 'tab-content' },
    // Period actions
    h('div', { className: 'period-actions' },
      !activeCycle
        ? h('button', { className: 'btn btn-primary', onClick: startPeriod },
            inlineIcon(Icon.droplet({ size: 16 }), 'Démarrer les règles'))
        : h('button', { className: 'btn btn-danger', onClick: endPeriod },
            inlineIcon(Icon.flag({ size: 16 }), 'Terminer les règles')),
      h('button', { className: 'btn btn-secondary', onClick: () => setSymptomDay(today) },
        inlineIcon(Icon.pain({ size: 16 }), activeCycle ? 'Symptômes du jour' : 'Ajouter une crise'))
    ),
    activeCycle && h('div', { className: 'badge badge-period', style: { marginBottom: '12px', display: 'inline-flex' } },
      inlineIcon(Icon.droplet({ size: 16 }), `Règles depuis le ${fmtDate(activeCycle.start)} (j${diffDays(activeCycle.start, today) + 1})`)
    ),

    // Calendar
    h('div', { className: 'card' },
      h('div', { className: 'cal-header' },
        h('div', { className: 'cal-nav-btn', onClick: () => { if (viewM === 0) { setViewM(11); setViewY(y => y-1); } else setViewM(m => m-1); } }, '‹'),
        h('div', { className: 'cal-month' }, `${MONTHS_FR[viewM]} ${viewY}`),
        h('div', { className: 'cal-nav-btn', onClick: () => { if (viewM === 11) { setViewM(0); setViewY(y => y+1); } else setViewM(m => m+1); } }, '›')
      ),
      h('div', { className: 'cal-grid' },
        DAYS_SHORT.map(d => h('div', { key: d, className: 'cal-dow' }, d)),
        calDays.map((cell, i) =>
          cell.type === 'empty'
            ? h('div', { key: `e${i}` })
            : h('div', {
                key: cell.ds,
                className: cell.cls,
                onClick: () => !cell.isFuture && openSymptom(cell.ds),
              }, cell.d)
        )
      ),
      h('div', { className: 'cal-legend' },
        h('div', { className: 'cal-legend-item' },
          h('div', { className: 'cal-legend-dot', style: { background: 'var(--period-bg)', border: '1px solid var(--period)' } }),
          'Règles'
        ),
        h('div', { className: 'cal-legend-item' },
          h('div', { className: 'cal-legend-dot', style: { background: 'rgba(212,103,138,0.07)', border: '1px solid var(--period)', opacity: 0.6 } }),
          'Prévision'
        ),
        h('div', { className: 'cal-legend-item' },
          h('div', { className: 'cal-legend-dot', style: { background: 'var(--ovul-bg)', border: '1px solid var(--ovul)' } }),
          'Ovulation'
        ),
        pill.enabled && h('div', { className: 'cal-legend-item' },
          h('div', { className: 'cal-legend-dot', style: { background: 'var(--pill-active)' } }),
          'Pilule prise'
        )
      )
    ),

    // Historique
    h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Historique des cycles'),
      !sortedCycles.length
        ? h('div', { className: 'empty-state' },
            h('div', { className: 'empty-state-icon' }, Icon.calendar({ size: 40 })),
            h('div', { className: 'empty-state-text' }, 'Aucun cycle enregistré.\nAppuie sur « Démarrer les règles » pour commencer.')
          )
        : sortedCycles.map(c =>
            h('div', { key: c.id, className: 'cycle-history-item' },
              h('div', { className: 'cycle-dot' }),
              h('div', { className: 'cycle-info' },
                h('div', { className: 'cycle-dates' },
                  fmtDate(c.start),
                  c.end ? ` → ${fmtDate(c.end)}` : ' → en cours'
                ),
                h('div', { className: 'cycle-duration' },
                  c.end
                    ? `${diffDays(c.start, c.end) + 1} jours de règles`
                    : `Jour ${diffDays(c.start, today) + 1}`
                )
              ),
              h('div', { className: 'cycle-del', onClick: () => setConfirmDel(c.id) }, Icon.trash({ size: 18 }))
            )
          )
    ),

    // Confirm delete dialog
    confirmDel && h('div', { className: 'modal-overlay', onClick: () => setConfirmDel(null) },
      h('div', { className: 'modal-box', onClick: e => e.stopPropagation(), style: { maxWidth: '360px' } },
        h('div', { className: 'modal-title' }, 'Supprimer ce cycle ?'),
        h('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' } },
          'Cette action est irréversible.'
        ),
        h('div', { className: 'modal-footer' },
          h('button', { className: 'btn btn-secondary', onClick: () => setConfirmDel(null) }, 'Annuler'),
          h('button', { className: 'btn btn-danger', onClick: () => deleteCycle(confirmDel) }, 'Supprimer')
        )
      )
    ),

    // Symptom modal
    symptomDay && h(SymptomModal, {
      dateStr: symptomDay,
      symptom: currentSymptom,
      onSave: saveSymptom,
      onClose: () => setSymptomDay(null),
    })
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PILL TAB
// ═════════════════════════════════════════════════════════════════════════════
const PILL_TYPE_LABELS = {
  contraceptive: 'Contraceptif (21+7)',
  hormonal:      'Hormonal (continu)',
  endometriose:  'Endométriose',
};
const PILL_TYPE_INFO = {
  contraceptive: 'Pilule estroprogestative combinee, souvent organisee en plaquette avec jours actifs et pause.',
  hormonal: 'Pilule progestative ou traitement hormonal continu, sans pause programmee dans le suivi.',
  endometriose: 'Traitement hormonal prescrit pour l endometriose, souvent a base de dienogest en prise continue.'
};
const PILL_SUGGESTIONS = {
  contraceptive: [
    'Leeloo', 'Minidril', 'Optilova', 'Adepal', 'Trinordiol', 'Daily Ge', 'Lovavulo',
    'Mercilon', 'Varnoline', 'Minesse', 'Melodia', 'Moneva', 'Harmonet', 'Minulet',
    'Triafemi', 'Tri Minulet'
  ],
  hormonal: [
    'Optimizette', 'Cerazette', 'Antigone', 'Desogestrel 75', 'Microval', 'Slinda',
    'Dienogest', 'Progynova'
  ],
  endometriose: [
    'Visanne', 'Dimetrum', 'Dienogest 2 mg', 'Sawis', 'Progestatif continu'
  ]
};
const ALL_PILL_SUGGESTIONS = Array.from(new Set(Object.values(PILL_SUGGESTIONS).flat()));

function PillTab({ data, onUpdate }) {
  const { pill, pillLog } = data;
  const today = todayStr();
  const [showSetup, setShowSetup] = useState(!pill.enabled);
  const [form, setForm] = useState({ ...pill });

  function saveForm() {
    const newPill = { ...form, enabled: true };
    onUpdate({ ...data, pill: newPill });
    setShowSetup(false);
  }

  function markToday(taken) {
    const newLog = { ...pillLog, [today]: { taken, takenAt: taken ? nowTime() : null } };
    onUpdate({ ...data, pillLog: newLog });
  }

  function resetPill() {
    onUpdate({ ...data, pill: { ...defaultData().pill }, pillLog: {} });
    setForm({ ...defaultData().pill });
    setShowSetup(true);
  }

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  const todayInfo = getPillDayInfo(pill, pillLog, today);
  const streak = getPillStreak(pill, pillLog);
  const missed = countMissedThisMonth(pill, pillLog);
  const currentSuggestions = PILL_SUGGESTIONS[form.type] || [];

  // Build blister: show current pack
  function buildBlister() {
    if (!pill.enabled || !pill.startDate) return [];
    if (pill.type === 'endometriose' || pill.type === 'hormonal') {
      const days = [];
      for (let i = 0; i < 28; i++) {
        const ds = addDays(pill.startDate, Math.floor(diffDays(pill.startDate, today) / 28) * 28 + i);
        const info = getPillDayInfo(pill, pillLog, ds);
        days.push({ ds, info, label: i + 1 });
      }
      return days;
    }
    // Contraceptive: find current cycle start
    const dayN = diffDays(pill.startDate, today);
    const cycleLen = pill.packDays + pill.pauseDays;
    const cycleStart = addDays(pill.startDate, Math.floor(dayN / cycleLen) * cycleLen);
    const days = [];
    for (let i = 0; i < cycleLen; i++) {
      const ds = addDays(cycleStart, i);
      const info = getPillDayInfo(pill, pillLog, ds);
      days.push({ ds, info, label: i + 1 });
    }
    return days;
  }

  const blister = useMemo(buildBlister, [pill, pillLog, today]);

  return h('div', { className: 'tab-content' },

    // Setup toggle
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
      h('div', null,
        h('div', { className: 'section-title' }, inlineIcon(Icon.pill({ size: 20 }), 'Mon traitement')),
        pill.enabled && h('div', { className: 'section-sub' }, pill.name || PILL_TYPE_LABELS[pill.type])
      ),
      pill.enabled
        ? h('button', { className: 'btn btn-secondary btn-sm', onClick: () => setShowSetup(s => !s) },
            showSetup ? 'Fermer' : inlineIcon(Icon.edit({ size: 14 }), 'Modifier'))
        : null
    ),

    // Setup form
    showSetup && h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Configuration du traitement'),

      h('div', { className: 'pill-type-tabs' },
        ['contraceptive', 'hormonal', 'endometriose'].map(t =>
          h('div', {
            key: t,
            className: `pill-type-tab${form.type === t ? ' active' : ''}`,
            onClick: () => upd('type', t),
          }, t === 'contraceptive' ? 'Contraceptif' : t === 'hormonal' ? 'Hormonal' : 'Endométriose')
        )
      ),

      h('div', { className: 'pill-type-help' },
        h('div', { className: 'pill-type-help-title' }, PILL_TYPE_LABELS[form.type]),
        h('div', null, PILL_TYPE_INFO[form.type]),
        h('div', { className: 'pill-type-help-note' }, 'A renseigner selon votre ordonnance ou l avis de votre pharmacien.')
      ),

      h('div', { className: 'field-row' },
        h('div', { className: 'field-label' }, 'Nom du médicament'),
        h('input', {
          className: 'inp',
          list: 'pill-name-suggestions',
          placeholder: currentSuggestions.length ? `Ex : ${currentSuggestions.slice(0, 3).join(', ')}...` : 'Nom du medicament',
          value: form.name,
          onChange: e => upd('name', e.target.value),
        }),
        h('datalist', { id: 'pill-name-suggestions' },
          ALL_PILL_SUGGESTIONS.map(name => h('option', { key: name, value: name }))
        ),
        h('div', { className: 'pill-suggestions' },
          currentSuggestions.slice(0, 8).map(name =>
            h('button', {
              key: name,
              type: 'button',
              className: `pill-suggestion${form.name === name ? ' active' : ''}`,
              onClick: () => upd('name', name)
            }, name)
          )
        )
      ),

      h('div', { className: 'field-row' },
        h('div', { className: 'field-label' }, 'Date de début du traitement'),
        h(DatePicker, { value: form.startDate, onChange: v => upd('startDate', v) })
      ),

      h('div', { className: 'field-row' },
        h('div', { className: 'field-label' }, 'Heure de prise'),
        h('input', { className: 'inp', type: 'time', value: form.time, onChange: e => upd('time', e.target.value) })
      ),

      form.type === 'contraceptive' && h('div', { style: { display: 'flex', gap: '10px' } },
        h('div', { className: 'field-row', style: { flex: 1 } },
          h('div', { className: 'field-label' }, 'Jours actifs'),
          h('input', {
            className: 'inp', type: 'number', min: 1, max: 84,
            value: form.packDays,
            onChange: e => upd('packDays', parseInt(e.target.value) || 21),
          })
        ),
        h('div', { className: 'field-row', style: { flex: 1 } },
          h('div', { className: 'field-label' }, 'Jours pause'),
          h('input', {
            className: 'inp', type: 'number', min: 0, max: 14,
            value: form.pauseDays,
            onChange: e => upd('pauseDays', parseInt(e.target.value) || 7),
          })
        )
      ),

      h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
        h('button', {
          className: 'btn btn-primary',
          style: { flex: 1 },
          onClick: saveForm,
          disabled: !form.startDate,
        }, 'Enregistrer'),
        pill.enabled && h('button', { className: 'btn btn-danger btn-sm', onClick: resetPill }, 'Réinitialiser')
      )
    ),

    // Today
    pill.enabled && !showSetup && h('div', { className: 'card' },
      h('div', { className: 'card-title' }, "Aujourd'hui"),
      todayInfo.type === 'active'
        ? h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '36px', display: 'flex', justifyContent: 'center', color: 'var(--pill-active)' } }, Icon.pill({ size: 36 })),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: '15px' } },
                  todayInfo.taken ? inlineIcon(Icon.check({ size: 17 }), 'Prise !') : `À prendre à ${pill.time}`
                ),
                todayInfo.taken
                  ? h('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } },
                      `Prise à ${pillLog[today]?.takenAt || pill.time}`)
                  : h('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } },
                      `Comprimé n°${todayInfo.dayNum}`)
              )
            ),
            h('div', { style: { display: 'flex', gap: '8px' } },
              !todayInfo.taken && h('button', { className: 'btn btn-primary', onClick: () => markToday(true) }, inlineIcon(Icon.check({ size: 16 }), 'Marquer comme prise')),
              todayInfo.taken && h('button', { className: 'btn btn-secondary btn-sm', onClick: () => markToday(false) }, 'Annuler')
            )
          )
        : todayInfo.type === 'pause'
          ? h('div', { style: { textAlign: 'center', padding: '16px 0' } },
              h('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '☕'),
              h('div', { style: { fontWeight: 700 } }, 'Jour de pause'),
              h('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' } },
                `Pause j${todayInfo.dayNum}/${pill.pauseDays}`)
            )
          : h('div', { style: { color: 'var(--text-secondary)', fontSize: '13px' } }, 'Traitement non commencé.')
    ),

    // Stats streak
    pill.enabled && !showSetup && h('div', { className: 'stat-grid', style: { marginBottom: '12px' } },
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num', style: { color: 'var(--pill-active)' } }, streak),
        h('div', { className: 'stat-card-label' }, '🔥 Streak actuel (jours)')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num', style: { color: missed > 0 ? 'var(--danger)' : 'var(--success)' } }, missed),
        h('div', { className: 'stat-card-label' }, 'Oublis ce mois')
      )
    ),

    // Blister pack
    pill.enabled && !showSetup && blister.length > 0 && h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Plaquette en cours'),
      h('div', { className: 'blister-grid blister-grid-7' },
        blister.map(({ ds, info, label }) => {
          const isToday = ds === today;
          const isFuture = ds > today;
          let cls = 'pill-circle';
          if (info.type === 'pause') cls += ' pause-day';
          else if (info.type === 'active') {
            if (isFuture) cls += ' active-future';
            else if (info.taken) cls += ' active-taken';
            else cls += ' active-missed';
          } else cls += ' off-day';
          if (isToday) cls += ' today';

          return h('div', {
            key: ds,
            className: cls,
            title: ds,
            style: isToday ? { outline: '2px solid var(--accent)', outlineOffset: '2px' } : {},
          }, info.type === 'pause' ? '·' : label)
        })
      ),
      h('div', { className: 'cal-legend', style: { marginTop: '10px' } },
        h('div', { className: 'cal-legend-item' },
          h('div', { className: 'cal-legend-dot', style: { background: 'var(--pill-active)' } }), 'Prise'),
        h('div', { className: 'cal-legend-item' },
          h('div', { className: 'cal-legend-dot', style: { border: '2px dashed var(--accent)', background: 'transparent' } }), 'Oubli'),
        h('div', { className: 'cal-legend-item' },
          h('div', { className: 'cal-legend-dot', style: { background: 'var(--bg-secondary)' } }), 'À venir'),
        pill.pauseDays > 0 && h('div', { className: 'cal-legend-item' },
          h('div', { className: 'cal-legend-dot', style: { background: 'var(--pill-pause)' } }), 'Pause')
      )
    )
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STATS TAB
// ═════════════════════════════════════════════════════════════════════════════
function StatsTab({ data }) {
  const { cycles, settings, symptoms = {} } = data;
  const done = cycles.filter(c => c.start && c.end);

  const avgCycle = computeAvgCycleLen(cycles, settings.cycleLength);
  const avgPeriod = computeAvgPeriodLen(cycles, settings.periodLength);

  // Cycle lengths for bar chart
  const recentCycles = done.slice(-6).sort((a, b) => a.start.localeCompare(b.start));
  const cycleLengths = [];
  for (let i = 1; i < recentCycles.length; i++) {
    cycleLengths.push({ label: fmtDate(recentCycles[i].start), len: diffDays(recentCycles[i-1].start, recentCycles[i].start) });
  }
  const maxCycleLen = cycleLengths.length ? Math.max(...cycleLengths.map(c => c.len)) : 1;

  // Period lengths
  const periodLengths = done.slice(-6).map(c => ({
    label: fmtDate(c.start),
    len: diffDays(c.start, c.end) + 1,
  }));
  const maxPeriodLen = periodLengths.length ? Math.max(...periodLengths.map(p => p.len)) : 1;

  // Regularity (std dev of cycle lengths)
  let regularity = '—';
  if (cycleLengths.length >= 2) {
    const mean = cycleLengths.reduce((a, c) => a + c.len, 0) / cycleLengths.length;
    const variance = cycleLengths.reduce((a, c) => a + Math.pow(c.len - mean, 2), 0) / cycleLengths.length;
    const std = Math.sqrt(variance).toFixed(1);
    regularity = std <= 2 ? `Très régulier (±${std}j)` : std <= 4 ? `Assez régulier (±${std}j)` : `Irrégulier (±${std}j)`;
  }

  // Symptom frequency
  const symptomCounts = {
    pain: 0,
    badMood: 0,
    endoFlare: 0,
    severePain: 0,
    impact: 0,
    treatment: 0,
    treatmentHelped: 0,
    pelvicPain: 0,
    ovarianLeft: 0,
    ovarianRight: 0,
    legSciatica: 0,
    rectalPain: 0,
    bladderPain: 0,
    urinationPain: 0,
    urinaryFrequency: 0,
    bowelPain: 0,
    constipation: 0,
    dyspareunia: 0,
    postSexPain: 0,
    bloating: 0,
    nausea: 0,
    vomiting: 0,
    diarrhea: 0,
    cramps: 0,
    headache: 0,
    fatigue: 0,
    dizziness: 0,
    backPain: 0,
    breastTenderness: 0,
    acne: 0,
    appetite: 0
  };
  let symTotal = 0;
  let painSum = 0;
  let painDays = 0;
  let fatigueSum = 0;
  let fatigueDays = 0;
  const allSymptoms = {
    ...(symptoms || {}),
  };
  done.forEach(c => {
    Object.entries(c.symptoms || {}).forEach(([date, s]) => {
      if (!allSymptoms[date]) allSymptoms[date] = s;
    });
  });
  Object.values(allSymptoms).forEach(s => {
      symTotal++;
      if (s.pain > 0) { painSum += Number(s.pain || 0); painDays++; }
      if (s.fatigueLevel > 0) { fatigueSum += Number(s.fatigueLevel || 0); fatigueDays++; }
      if (s.pain >= 2) symptomCounts.pain++;
      if (s.pain >= 3) symptomCounts.severePain++;
      if (s.endoFlare) symptomCounts.endoFlare++;
      if (s.impact && s.impact !== 'none') symptomCounts.impact++;
      if ((s.painMedication || '').trim()) symptomCounts.treatment++;
      if (s.painRelief === 'partial' || s.painRelief === 'good') symptomCounts.treatmentHelped++;
      if (s.mood === 'bad' || s.mood === 'irritable' || s.mood === 'anxious') symptomCounts.badMood++;
      ENDO_TRACKED_KEYS.forEach(k => {
        if (s[k]) symptomCounts[k]++;
      });
  });
  const maxSym = Math.max(...Object.values(symptomCounts), 1);
  const avgPain = painDays ? (painSum / painDays).toFixed(1) : '—';
  const avgFatigue = fatigueDays ? (fatigueSum / fatigueDays).toFixed(1) : '—';

  if (!done.length && !symTotal) return h('div', { className: 'tab-content' },
    h('div', { className: 'empty-state' },
      h('div', { className: 'empty-state-icon' }, Icon.chart({ size: 40 })),
      h('div', { className: 'empty-state-text' }, 'Enregistre un cycle ou une crise\npour voir tes statistiques.')
    )
  );

  return h('div', { className: 'tab-content' },
    // Summary
    h('div', { className: 'stat-grid' },
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num' }, done.length),
        h('div', { className: 'stat-card-label' }, 'Cycles complets')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num' }, avgCycle),
        h('div', { className: 'stat-card-label' }, 'Durée moy. cycle (j)')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num' }, avgPeriod),
        h('div', { className: 'stat-card-label' }, 'Durée moy. règles (j)')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-card-num', style: { fontSize: '16px' } }, cycleLengths.length >= 2 ? regularity.split('(')[0].trim() : '—'),
        h('div', { className: 'stat-card-label' }, 'Régularité')
      )
    ),

    symTotal > 0 && h('div', { className: 'card endo-summary-card' },
      h('div', { className: 'card-title' }, 'Résumé endométriose'),
      h('div', { className: 'endo-summary-grid' },
        h('div', { className: 'endo-summary-item' },
          h('strong', null, symptomCounts.endoFlare || symptomCounts.severePain),
          h('span', null, 'Crises / douleurs fortes')
        ),
        h('div', { className: 'endo-summary-item' },
          h('strong', null, avgPain),
          h('span', null, 'Douleur moyenne')
        ),
        h('div', { className: 'endo-summary-item' },
          h('strong', null, avgFatigue),
          h('span', null, 'Fatigue moyenne')
        ),
        h('div', { className: 'endo-summary-item' },
          h('strong', null, symptomCounts.impact),
          h('span', null, 'Jours avec impact')
        )
      ),
      symptomCounts.treatment > 0 && h('div', { className: 'endo-summary-note' },
        `${symptomCounts.treatmentHelped}/${symptomCounts.treatment} traitements notés avec soulagement partiel ou bon.`
      )
    ),

    // Cycle lengths chart
    cycleLengths.length > 0 && h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Durée des cycles (derniers 6)'),
      cycleLengths.map((c, i) =>
        h('div', { key: i, className: 'stat-bar-row' },
          h('div', { className: 'stat-bar-label' },
            h('span', null, c.label),
            h('span', null, `${c.len} j`)
          ),
          h('div', { className: 'stat-bar-track' },
            h('div', { className: 'stat-bar-fill', style: { width: `${(c.len / maxCycleLen) * 100}%` } })
          )
        )
      )
    ),

    // Period lengths
    periodLengths.length > 0 && h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Durée des règles (derniers 6)'),
      periodLengths.map((p, i) =>
        h('div', { key: i, className: 'stat-bar-row' },
          h('div', { className: 'stat-bar-label' },
            h('span', null, p.label),
            h('span', null, `${p.len} j`)
          ),
          h('div', { className: 'stat-bar-track' },
            h('div', { className: 'stat-bar-fill', style: { width: `${(p.len / maxPeriodLen) * 100}%`, background: 'var(--accent2)' } })
          )
        )
      )
    ),

    // Symptom frequency
    symTotal > 0 && h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Symptômes les plus fréquents'),
      [
        { key: 'pain', icon: Icon.pain, label: 'Douleurs (modérées+)', count: symptomCounts.pain },
        { key: 'severePain', icon: Icon.alert, label: 'Douleurs fortes/intenses', count: symptomCounts.severePain },
        { key: 'endoFlare', icon: Icon.alert, label: 'Crises endométriose', count: symptomCounts.endoFlare },
        { key: 'impact', icon: Icon.flag, label: 'Impact quotidien', count: symptomCounts.impact },
        { key: 'badMood', icon: Icon.heart, label: 'Humeur difficile', count: symptomCounts.badMood },
        { key: 'pelvicPain', icon: Icon.pain, label: 'Douleur pelvienne', count: symptomCounts.pelvicPain },
        { key: 'ovarianLeft', icon: Icon.pain, label: 'Ovaire gauche', count: symptomCounts.ovarianLeft },
        { key: 'ovarianRight', icon: Icon.pain, label: 'Ovaire droit', count: symptomCounts.ovarianRight },
        { key: 'legSciatica', icon: Icon.pain, label: 'Jambe / sciatique', count: symptomCounts.legSciatica },
        { key: 'rectalPain', icon: Icon.pain, label: 'Rectum / périnée', count: symptomCounts.rectalPain },
        { key: 'bladderPain', icon: Icon.waves, label: 'Vessie', count: symptomCounts.bladderPain },
        { key: 'urinationPain', icon: Icon.waves, label: 'Douleur en urinant', count: symptomCounts.urinationPain },
        { key: 'urinaryFrequency', icon: Icon.waves, label: 'Envies fréquentes', count: symptomCounts.urinaryFrequency },
        { key: 'bowelPain', icon: Icon.waves, label: 'Douleur à la selle', count: symptomCounts.bowelPain },
        { key: 'constipation', icon: Icon.waves, label: 'Constipation', count: symptomCounts.constipation },
        { key: 'dyspareunia', icon: Icon.heart, label: 'Rapport douloureux', count: symptomCounts.dyspareunia },
        { key: 'postSexPain', icon: Icon.heart, label: 'Douleur après rapport', count: symptomCounts.postSexPain },
        { key: 'nausea', icon: Icon.waves, label: 'Nausées', count: symptomCounts.nausea },
        { key: 'vomiting', icon: Icon.waves, label: 'Vomissements', count: symptomCounts.vomiting },
        { key: 'diarrhea', icon: Icon.waves, label: 'Diarrhée', count: symptomCounts.diarrhea },
        { key: 'bloating', icon: Icon.waves, label: 'Ballonnements', count: symptomCounts.bloating },
        { key: 'cramps', icon: Icon.pain, label: 'Crampes', count: symptomCounts.cramps },
        { key: 'headache', icon: Icon.headache, label: 'Maux de tête', count: symptomCounts.headache },
        { key: 'fatigue', icon: Icon.moon, label: 'Fatigue', count: symptomCounts.fatigue },
        { key: 'dizziness', icon: Icon.monitor, label: 'Vertiges', count: symptomCounts.dizziness },
        { key: 'backPain', icon: Icon.pain, label: 'Douleurs lombaires', count: symptomCounts.backPain },
        { key: 'breastTenderness', icon: Icon.heart, label: 'Seins sensibles', count: symptomCounts.breastTenderness },
        { key: 'acne', icon: Icon.sparkle, label: 'Acné', count: symptomCounts.acne },
        { key: 'appetite', icon: Icon.heart, label: 'Appétit inhabituel', count: symptomCounts.appetite },
      ].map(s =>
        h('div', { key: s.key, className: 'symptom-freq-row' },
          h('div', { className: 'symptom-freq-name' }, inlineIcon(s.icon({ size: 14 }), s.label)),
          h('div', { className: 'symptom-freq-bar' },
            h('div', { className: 'symptom-freq-fill', style: { width: `${(s.count / maxSym) * 100}%` } })
          ),
          h('div', { className: 'symptom-freq-count' }, s.count)
        )
      )
    )
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═════════════════════════════════════════════════════════════════════════════
function getAllSymptomEntries(data) {
  const all = { ...(data.symptoms || {}) };
  (data.cycles || []).forEach(c => {
    Object.entries(c.symptoms || {}).forEach(([date, s]) => {
      if (!all[date]) all[date] = s;
    });
  });
  return Object.entries(all).sort(([a], [b]) => b.localeCompare(a));
}

function buildMedicalSummary(data) {
  const entries = getAllSymptomEntries(data);
  const severe = entries.filter(([, s]) => s.pain >= 3 || s.endoFlare);
  const impacted = entries.filter(([, s]) => s.impact && s.impact !== 'none');
  const treatments = entries.filter(([, s]) => (s.painMedication || '').trim());
  const avg = (values) => values.length ? (values.reduce((a, v) => a + Number(v || 0), 0) / values.length).toFixed(1) : '-';
  const lines = [
    `Résumé EDcycle - ${todayStr()}`,
    '',
    `Cycles enregistrés : ${(data.cycles || []).filter(c => c.end).length}`,
    `Jours avec symptômes : ${entries.length}`,
    `Crises / douleurs fortes : ${severe.length}`,
    `Jours avec impact quotidien : ${impacted.length}`,
    `Douleur moyenne notée : ${avg(entries.map(([, s]) => s.pain).filter(v => v > 0))}/4`,
    `Fatigue moyenne notée : ${avg(entries.map(([, s]) => s.fatigueLevel).filter(v => v > 0))}/4`,
    '',
    'Traitement actuel :',
    data.pill?.enabled ? `- ${data.pill.name || PILL_TYPE_LABELS[data.pill.type] || 'Traitement'} à ${data.pill.time}` : '- Aucun traitement renseigné',
    '',
    'Dernières crises / douleurs fortes :',
    ...(severe.slice(0, 12).map(([date, s]) => {
      const details = [
        `douleur ${s.pain || 0}/4`,
        s.fatigueLevel ? `fatigue ${s.fatigueLevel}/4` : null,
        s.impact && s.impact !== 'none' ? `impact ${s.impact}` : null,
        s.painMedication ? `traitement: ${s.painMedication}` : null,
        s.painRelief && s.painRelief !== 'unknown' ? `soulagement: ${s.painRelief}` : null,
      ].filter(Boolean).join(', ');
      return `- ${fmtDate(date)} : ${details}${s.notes ? ` | ${s.notes}` : ''}`;
    })),
    severe.length ? '' : '- Aucune crise forte notée',
    '',
    `Traitements ponctuels notés : ${treatments.length}`,
  ];
  return lines.join('\n');
}

function SettingsTab({ data, onUpdate, theme, onThemeChange, storageKey }) {
  const { settings } = data;
  const [showClear, setShowClear] = useState(false);

  function upd(k, v) {
    const newSettings = { ...settings, [k]: v };
    onUpdate({ ...data, settings: newSettings });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edcycle-sauvegarde-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportMedicalSummary() {
    const blob = new Blob([buildMedicalSummary(data)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edcycle-resume-medecin-${todayStr()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const d = defaultData();
        const merged = mergeData(parsed);
        onUpdate(merged);
      } catch { alert('Fichier invalide.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function clearAll() {
    localStorage.removeItem(storageKey || STORAGE_KEY);
    onUpdate(defaultData());
    setShowClear(false);
  }

  return h('div', { className: 'tab-content' },
    h('div', { className: 'section-title', style: { marginBottom: '16px' } }, inlineIcon(Icon.settings({ size: 20 }), 'Réglages')),

    h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Apparence'),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Thème'),
          h('div', { className: 'settings-sub' }, 'Clair, sombre ou système')
        ),
        h('div', { className: 'seg-control' },
          ['system', 'light', 'dark'].map(t =>
            h('div', {
              key: t,
              className: `seg-btn${theme === t ? ' active' : ''}`,
              onClick: () => onThemeChange(t),
            }, t === 'system' ? Icon.monitor({ size: 16 }) : t === 'light' ? Icon.sun({ size: 16 }) : Icon.moon({ size: 16 }))
          )
        )
      )
    ),

    h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Paramètres du cycle'),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Durée estimée du cycle'),
          h('div', { className: 'settings-sub' }, 'En jours (28 par défaut)')
        ),
        h('input', {
          type: 'number', min: 20, max: 45,
          className: 'inp',
          style: { width: '70px', textAlign: 'center' },
          value: settings.cycleLength,
          onChange: e => upd('cycleLength', parseInt(e.target.value) || 28),
        })
      ),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Durée estimée des règles'),
          h('div', { className: 'settings-sub' }, 'En jours (5 par défaut)')
        ),
        h('input', {
          type: 'number', min: 1, max: 10,
          className: 'inp',
          style: { width: '70px', textAlign: 'center' },
          value: settings.periodLength,
          onChange: e => upd('periodLength', parseInt(e.target.value) || 5),
        })
      )
    ),

    h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Données'),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Application EDcycle'),
          h('div', { className: 'settings-sub' }, 'Installer ou mettre a jour cette app')
        ),
        h(DownloadAppButton, { compact: true })
      ),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Exporter les données'),
          h('div', { className: 'settings-sub' }, 'Télécharge un fichier JSON de sauvegarde')
        ),
        h('button', { className: 'btn btn-secondary btn-sm', onClick: exportData }, inlineIcon(Icon.download({ size: 15 }), 'Exporter'))
      ),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Résumé médecin'),
          h('div', { className: 'settings-sub' }, 'Crises, douleur, fatigue, impact et traitements')
        ),
        h('button', { className: 'btn btn-secondary btn-sm', onClick: exportMedicalSummary }, inlineIcon(Icon.note({ size: 15 }), 'Exporter'))
      ),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Importer des données'),
          h('div', { className: 'settings-sub' }, 'Restaurer depuis un fichier JSON')
        ),
        h('label', { className: 'btn btn-secondary btn-sm', style: { cursor: 'pointer' } },
          inlineIcon(Icon.upload({ size: 15 }), 'Importer'),
          h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onChange: importData })
        )
      )
    ),

    h('div', { className: 'card danger-zone' },
      h('div', { className: 'card-title' }, inlineIcon(Icon.alert({ size: 14 }), 'Zone dangereuse')),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Effacer toutes les données'),
          h('div', { className: 'settings-sub' }, 'Supprime cycles, pilule et historique')
        ),
        h('button', { className: 'btn btn-danger btn-sm', onClick: () => setShowClear(true) }, inlineIcon(Icon.trash({ size: 15 }), 'Effacer'))
      )
    ),

    h('div', { style: { textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '20px' } },
      `EDcycle v${APP_VERSION} — Données stockées localement`
    ),

    showClear && h('div', { className: 'modal-overlay', onClick: () => setShowClear(false) },
      h('div', { className: 'modal-box', onClick: e => e.stopPropagation(), style: { maxWidth: '360px' } },
        h('div', { className: 'modal-title' }, 'Effacer toutes les données ?'),
        h('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' } },
          'Cette action est irréversible. Tous tes cycles et ta configuration de pilule seront supprimés.'
        ),
        h('div', { className: 'modal-footer' },
          h('button', { className: 'btn btn-secondary', onClick: () => setShowClear(false) }, 'Annuler'),
          h('button', { className: 'btn btn-danger', onClick: clearAll }, 'Tout effacer')
        )
      )
    )
  );
}

function AccountTab({ me, token, data, onLogout, onDeleteLocal }) {
  const isLocal = !isOnlineToken(token);
  const completedCycles = data.cycles.filter(c => c.start && c.end).length;
  const symptomDates = new Set(Object.keys(data.symptoms || {}));
  data.cycles.forEach(c => Object.keys(c.symptoms || {}).forEach(date => symptomDates.add(date)));
  const symptomDays = symptomDates.size;
  const crisisDays = getAllSymptomEntries(data).filter(([, s]) => s.endoFlare || s.pain >= 3).length;
  const pillTaken = Object.values(data.pillLog || {}).filter(v => v?.taken).length;
  const openOnlinePanel = () => {
    if (window.openEDAccountPanel) window.openEDAccountPanel(me);
    else window.open('https://compte.e-d.fr/', '_blank');
  };
  const Row = (label, value) =>
    h('div', { className: 'account-row' },
      h('span', null, label),
      h('strong', null, value)
    );

  return h('div', { className: 'tab-content' },
    h('div', { className: 'section-title' }, inlineIcon(Icon.user({ size: 20 }), 'Mon compte')),
    h('div', { className: 'section-sub' }, isLocal ? 'Profil local sur cet appareil' : 'Compte e-d connecte'),

    h('div', { className: 'card account-card' },
      h('div', { className: 'account-head' },
        h('div', { className: 'account-avatar' }, me?.avatar ? h('img', { src: me.avatar, alt: '' }) : (me?.username || '?')[0].toUpperCase()),
        h('div', { className: 'account-info' },
          h('div', { className: 'account-name' }, me?.username || 'Compte'),
          h('div', { className: 'account-sub' }, me?.alias || me?.email || (isLocal ? 'Mode local' : 'Compte en ligne'))
        )
      ),
      h('div', { className: isLocal ? 'account-status local' : 'account-status online' },
        isLocal ? 'Local - donnees sur cet appareil uniquement' : 'En ligne - connexion e-d active'
      ),
      me?.email && Row('Email', me.email),
      Row('Identifiant', me?.id || '-'),
      Row('Type de compte', isLocal ? 'Local' : 'En ligne')
    ),

    h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Mes donnees EDcycle'),
      Row('Cycles termines', completedCycles),
      Row('Jours avec symptomes', symptomDays),
      Row('Crises / douleurs fortes', crisisDays),
      Row('Prises de pilule notees', pillTaken)
    ),

    h('div', { className: 'card' },
      h('div', { className: 'card-title' }, 'Actions'),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Télécharger EDcycle'),
          h('div', { className: 'settings-sub' }, 'APK Android ou application desktop')
        ),
        h(DownloadAppButton, { compact: true })
      ),
      !isLocal && h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Gerer le compte e-d'),
          h('div', { className: 'settings-sub' }, 'Profil, mot de passe et securite')
        ),
        h('button', { className: 'btn btn-secondary btn-sm', onClick: openOnlinePanel }, 'Ouvrir')
      ),
      h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, isLocal ? 'Changer de compte' : 'Se deconnecter'),
          h('div', { className: 'settings-sub' }, 'Retourne a l ecran de connexion')
        ),
        h('button', { className: 'btn btn-secondary btn-sm', onClick: onLogout }, isLocal ? 'Changer' : 'Deconnexion')
      ),
      isLocal && h('div', { className: 'settings-row' },
        h('div', { className: 'settings-info' },
          h('div', { className: 'settings-label' }, 'Supprimer ce profil local'),
          h('div', { className: 'settings-sub' }, 'Efface les donnees EDcycle de ce pseudo')
        ),
        h('button', { className: 'btn btn-danger btn-sm', onClick: onDeleteLocal }, 'Supprimer')
      )
    )
  );
}

function getInitialAuth() {
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null'); } catch { return null; } })();
  if (storedToken && storedUser) return { token: storedToken, user: storedUser };
  const cookieToken = getCookieToken();
  const decoded = cookieToken ? decodeJWT(cookieToken) : null;
  if (decoded?.id) {
    const user = { id: decoded.id, username: decoded.username || decoded.email || 'Compte e-d', email: decoded.email || '', avatar: decoded.avatar || '', alias: decoded.alias || '' };
    localStorage.setItem(AUTH_TOKEN_KEY, cookieToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { token: cookieToken, user };
  }
  return { token: null, user: null };
}

// ═════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═════════════════════════════════════════════════════════════════════════════
function App() {
  const initialAuth = useMemo(getInitialAuth, []);
  const [token, setToken] = useState(initialAuth.token);
  const [me, setMe] = useState(initialAuth.user);
  const [data, setData] = useState(() => loadData(initialAuth.user?.id));
  const [tab, setTab] = useState('home');
  const [theme, setTheme] = useState(() => {
    const d = loadData(initialAuth.user?.id);
    return d.settings.theme || 'system';
  });
  const isAuthed = !!(token && me);
  const storageKey = dataStorageKey(me?.id);

  useEffect(() => { applyTheme(theme); }, [theme]);

  useEffect(() => {
    if (!me?.id) return;
    const next = loadData(me.id);
    setData(next);
    setTheme(next.settings.theme || 'system');
  }, [me?.id]);

  function onUpdate(newData) {
    setData(newData);
    saveData(newData, me?.id);
  }

  function onThemeChange(t) {
    setTheme(t);
    const newData = { ...data, settings: { ...data.settings, theme: t } };
    setData(newData);
    saveData(newData, me?.id);
  }
  
  function login(tok, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, tok);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    setToken(tok);
    setMe(user);
    setTab('home');
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setMe(null);
    setTab('home');
  }

  function deleteLocalProfile() {
    if (!me?.id || isOnlineToken(token)) return;
    if (!confirm('Supprimer ce compte local et toutes ses donnees EDcycle ?')) return;
    localStorage.removeItem(dataStorageKey(me.id));
    logout();
  }

  if (!isAuthed) return h(AuthScreen, { onLogin: login });

  const tabProps = { data, onUpdate, setTab };

  return h('div', { className: 'app-shell' },
    h(SideNav, { tab, setTab }),
    h('div', { className: 'main-area' },
      h(TopBar, { tab, theme, setTab, onThemeToggle: () => onThemeChange(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system') }),
      tab === 'home'     && h(DashboardTab, tabProps),
      tab === 'cycle'    && h(CycleTab,     tabProps),
      tab === 'pill'     && h(PillTab,      tabProps),
      tab === 'stats'    && h(StatsTab,     tabProps),
      tab === 'settings' && h(SettingsTab, { ...tabProps, theme, onThemeChange, storageKey }),
      tab === 'account'  && h(AccountTab, { me, token, data, onLogout: logout, onDeleteLocal: deleteLocalProfile }),
    ),
    h(BottomNav, { tab, setTab })
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(ErrorBoundary, null, h(App)));






