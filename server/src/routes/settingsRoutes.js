const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingsController');

const router = express.Router();

// Office contact details shown on the public landing page.
router.get('/public', getSettings);

router.use(protect);
router.get('/', getSettings);
router.put('/', authorize('admin'), updateSettings);

module.exports = router;
