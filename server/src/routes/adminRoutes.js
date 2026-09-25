const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { exportBackup } = require('../controllers/exportController');

const router = express.Router();
router.use(protect, authorize('admin'));

router.get('/backup', exportBackup);

module.exports = router;
