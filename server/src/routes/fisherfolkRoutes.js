const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getMine,
  saveMine,
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  myPdf,
  applicationPdf,
} = require('../controllers/fisherfolkController');

const router = express.Router();

router.use(protect);

router.get('/me', authorize('fishpond_owner'), getMine);
router.put(
  '/me',
  authorize('fishpond_owner'),
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'barangayCert', maxCount: 1 },
  ]),
  saveMine
);
router.get('/me/pdf', authorize('fishpond_owner'), myPdf);

router.get('/', authorize('agriculture_staff', 'admin'), listApplications);
router.get('/:id', getApplication);
router.get('/:id/pdf', applicationPdf);
router.patch('/:id/approve', authorize('agriculture_staff', 'admin'), approveApplication);
router.patch('/:id/reject', authorize('agriculture_staff', 'admin'), rejectApplication);

module.exports = router;
