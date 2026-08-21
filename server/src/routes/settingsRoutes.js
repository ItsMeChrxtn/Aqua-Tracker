const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingsController');

const router = express.Router();
router.use(protect);

router.get('/', getSettings);
router.put('/', authorize('admin', 'agriculture_staff'), updateSettings);

module.exports = router;
