export const ETHIOPIAN_TIME_ZONE = 'Africa/Addis_Ababa';

const DATE_LOCALE = 'en-GB';

const asDate = value => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00Z`);
  }
  return value instanceof Date ? value : new Date(value);
};

export const formatEthiopianDate = (value, options = {}) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    timeZone: ETHIOPIAN_TIME_ZONE,
    calendar: 'ethiopic',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(asDate(value));
};

export const formatEthiopianTime = (value, { seconds = false } = {}) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ETHIOPIAN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).format(asDate(value));
};

export const formatEthiopianDateTime = value => {
  if (!value) return '—';
  return `${formatEthiopianDate(value, { year: 'numeric', month: 'short', day: 'numeric' })} ${formatEthiopianTime(value)}`;
};

export const getAddisAbabaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ETHIOPIAN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const getAddisAbabaDateParts = (date = new Date()) => {
  const [year, month, day] = getAddisAbabaDateString(date).split('-').map(Number);
  return { year, month, day };
};
