import { PASSWORD_MIN, PASSWORD_MAX } from './limits';

// Keep in sync with server/src/utils/password.js.
export const PASSWORD_RULES = [
  { key: 'length', label: `${PASSWORD_MIN}–${PASSWORD_MAX} characters long`, test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { key: 'upper', label: 'At least one uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'At least one lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'At least one number (0–9)', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'At least one special character (!@#$%)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isStrongPassword = (password) => PASSWORD_RULES.every((rule) => rule.test(password || ''));
