const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('./errorHandler');
const User = require('../models/User');

const PASSWORD_CHANGE_ALLOWED = [
  ['GET', '/api/auth/me'],
  ['PUT', '/api/auth/change-password'],
];

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, 'Not authorized, user no longer exists');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Account is inactive. Contact an administrator.');
  }
  // Until an emailed temporary password is replaced, the account can only
  // read its own profile and change its password.
  if (user.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.some(([method, path]) => req.method === method && req.originalUrl.split('?')[0] === path)) {
    throw new ApiError(403, 'Please set a new password before continuing.', 'PASSWORD_CHANGE_REQUIRED');
  }

  req.user = user;
  next();
});

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    next();
  };
}

module.exports = { protect, authorize };
