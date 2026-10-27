// Durations: "1d 2h 30m", "1.5h", "45m", or a bare number of
// hours. A day is 8 hours and a week 5 days.
export const MINUTES_PER_DAY = 8 * 60;

const UNIT_MINUTES = { w: 5 * MINUTES_PER_DAY, d: MINUTES_PER_DAY, h: 60, m: 1 };

export const parseDuration = (text) => {
  const value = String(text ?? '').trim().toLowerCase();
  if (!value) return null;
  if (/^\d+(\.\d+)?$/.test(value)) return Math.round(parseFloat(value) * 60);
  const parts = value.replace(/\s+/g, '').match(/\d+(\.\d+)?[wdhm]/g);
  if (!parts || parts.join('') !== value.replace(/\s+/g, '')) return null;
  return Math.round(parts.reduce((sum, part) => sum + parseFloat(part) * UNIT_MINUTES[part.slice(-1)], 0));
};

// 90 -> "1h 30m", 0 -> "0h". Hours rather than days so totals read the same
// on the timesheet, the issue and the capacity page.
export const formatDuration = (minutes) => {
  if (minutes == null) return '';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (!h && !m) return '0h';
  return sign + [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
};

// Compact hours for dense grids: 450 -> "7.5", 0 -> "".
export const formatHours = (minutes) => {
  if (!minutes) return '';
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0$/, '');
};

// Local calendar dates as YYYY-MM-DD (toISOString would shift to UTC).
const pad = (n) => String(n).padStart(2, '0');
export const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const fromDateKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
export const startOfWeek = (date) => addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -((date.getDay() + 6) % 7));
