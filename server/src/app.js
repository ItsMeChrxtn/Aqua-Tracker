const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

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

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'AquaTrack API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/fishponds', fishpondRoutes);
app.use('/api', monitoringRoutes); // /api/fishponds/:id/cycles, /api/cycles/:id, records, harvest
app.use('/api', inventoryRoutes); // /api/fishponds/:id/inventory, /api/inventory/:id
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
