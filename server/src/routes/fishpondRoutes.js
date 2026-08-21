const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  listFishponds,
  getFishpond,
  registerFishpond,
  updateFishpond,
  deleteFishpond,
  approveFishpond,
  rejectFishpond,
} = require('../controllers/fishpondController');

const router = express.Router();

router.use(protect);

router.get('/', listFishponds);
router.post('/', authorize('fishpond_owner'), upload.single('image'), registerFishpond);
router.get('/:id', getFishpond);
router.put('/:id', upload.single('image'), updateFishpond);
router.delete('/:id', deleteFishpond);
router.patch('/:id/approve', authorize('agriculture_staff', 'admin'), approveFishpond);
router.patch('/:id/reject', authorize('agriculture_staff', 'admin'), rejectFishpond);

module.exports = router;
