const Notification = require('../models/Notification');

async function createNotification({ user, fishpond, type, message }) {
  try {
    return await Notification.create({ user, fishpond, type, message });
  } catch (err) {
    console.error('[notify] failed to create notification:', err.message);
    return null;
  }
}

module.exports = { createNotification };
