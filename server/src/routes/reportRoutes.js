const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ownerSummary, municipalSummary, adminSummary } = require('../controllers/reportController');
const { exportExcel, exportPdf } = require('../controllers/exportController');

const router = express.Router();
router.use(protect);

router.get('/owner-summary', authorize('fishpond_owner'), ownerSummary);
router.get('/municipal-summary', authorize('agriculture_staff', 'admin'), municipalSummary);
router.get('/admin-summary', authorize('admin'), adminSummary);
router.get('/export/excel', exportExcel);
router.get('/export/pdf', exportPdf);

module.exports = router;
