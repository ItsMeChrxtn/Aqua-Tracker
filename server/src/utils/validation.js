const { ApiError } = require('../middleware/errorHandler');

// The only barangays where owners and fishponds can be registered.
// Keep in sync with FISHPOND_BARANGAYS in client/src/utils/barangays.js.
const ALLOWED_BARANGAYS = ['San Juan II', 'San Rafael III', 'San Rafael IV'];

// Digits, plus the usual phone punctuation (+, -, spaces, parentheses).
function assertValidPhone(phone) {
  if (phone && !/^[0-9+\-\s()]+$/.test(String(phone))) {
    throw new ApiError(400, 'Phone number must contain numbers only');
  }
}

// A new barangay choice must be an allowed one; an older saved value may stay.
function assertAllowedBarangay(barangay, current) {
  if (barangay && barangay !== current && !ALLOWED_BARANGAYS.includes(barangay)) {
    throw new ApiError(400, `Barangay must be one of: ${ALLOWED_BARANGAYS.join(', ')}`);
  }
}

// Today's date in the Philippines as YYYY-MM-DD.
function todayInManila() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

// The calendar date (YYYY-MM-DD) of a submitted date value.
function dateOnly(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);
}

// Stocking, start-cycle and feeding dates cannot be in the past.
function assertNotPastDate(value, label = 'Date') {
  const day = dateOnly(value);
  if (!day) throw new ApiError(400, `${label} is not a valid date`);
  if (day < todayInManila()) throw new ApiError(400, `${label} cannot be in the past — choose today or a later date`);
}

module.exports = { ALLOWED_BARANGAYS, assertValidPhone, assertAllowedBarangay, assertNotPastDate, dateOnly, todayInManila };
