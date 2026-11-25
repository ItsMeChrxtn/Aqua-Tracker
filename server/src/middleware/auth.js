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

  // Most older routes only check that someone is logged in, so buyers are kept
  // to the marketplace side of the API here instead of route by route.
  if (user.role === 'buyer' && !buyerMayUse(req)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }

  req.user = user;
  next();
});

const BUYER_PATHS = ['/api/auth/', '/api/notifications', '/api/marketplace', '/api/orders'];
const BUYER_READ_ONLY_PATHS = ['/api/species', '/api/settings'];

function buyerMayUse(req) {
  const path = req.originalUrl.split('?')[0];
  const under = (prefix) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`);
  if (BUYER_PATHS.some(under)) return true;
  return req.method === 'GET' && BUYER_READ_ONLY_PATHS.some(under);
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    next();
  };
}

module.exports = { protect, authorize };
