const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { listLogs } = require('../controllers/activityLogController');

const router = express.Router();
router.use(protect, authorize('admin'));

router.get('/', listLogs);

module.exports = router;
