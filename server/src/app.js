// Before any model is loaded, so every model gets edit tracking.
require('./utils/changeTracking');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const speciesRoutes = require('./routes/speciesRoutes');
const fishpondRoutes = require('./routes/fishpondRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fisherfolkRoutes = require('./routes/fisherfolkRoutes');
const productRoutes = require('./routes/productRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();

// Behind a hosting proxy (Render, Railway…) set TRUST_PROXY=1 so the rate
// limits below see the visitor's real IP address.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Security headers. Uploaded photos are shown by the client on another
// origin, so they must stay loadable cross-origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Slows down password guessing and OTP / email spam.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' },
});
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/verify-email', '/api/auth/resend-otp'], authLimiter);

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'AquaTrack API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/fishponds', fishpondRoutes);
app.use('/api/fisherfolk', fisherfolkRoutes);
app.use('/api/products', productRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/orders', orderRoutes);
// Mounted before the catch-all /api routers below, which require a login for
// everything that passes through them; /api/settings/public must stay open.
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes); // QR verification, no login
app.use('/api', monitoringRoutes); // /api/fishponds/:id/cycles, /api/cycles/:id, records, harvest
app.use('/api', inventoryRoutes); // /api/fishponds/:id/inventory, /api/inventory/:id
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
