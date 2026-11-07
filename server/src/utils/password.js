const PASSWORD_MIN = 8;
const PASSWORD_MAX = 13;

// Returns a user-facing error when the password is outside the allowed
// length, otherwise null. Only applied when a password is chosen, so older
// accounts with shorter passwords can still sign in.
function passwordError(password, label = 'Password') {
  const length = typeof password === 'string' ? password.length : 0;
  if (length < PASSWORD_MIN || length > PASSWORD_MAX) {
    return `${label} must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters`;
  }
  return null;
}

module.exports = { PASSWORD_MIN, PASSWORD_MAX, passwordError };
