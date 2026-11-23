const PASSWORD_MIN = 8;
const PASSWORD_MAX = 13;

// The rules a newly chosen password must meet. Keep in sync with
// client/src/utils/password.js, which shows them as a checklist.
const PASSWORD_RULES = [
  { test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX, message: `be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters long` },
  { test: (p) => /[A-Z]/.test(p), message: 'contain at least one uppercase letter (A–Z)' },
  { test: (p) => /[a-z]/.test(p), message: 'contain at least one lowercase letter (a–z)' },
  { test: (p) => /[0-9]/.test(p), message: 'contain at least one number (0–9)' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'contain at least one special character (e.g. !@#$%)' },
];

// Returns a user-facing error for the first rule the password breaks,
// otherwise null. Only applied when a password is chosen, so older accounts
// with weaker passwords can still sign in.
function passwordError(password, label = 'Password') {
  const value = typeof password === 'string' ? password : '';
  const broken = PASSWORD_RULES.find((rule) => !rule.test(value));
  return broken ? `${label} must ${broken.message}` : null;
}

module.exports = { PASSWORD_MIN, PASSWORD_MAX, passwordError };
