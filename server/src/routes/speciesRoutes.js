const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listSpecies,
  getSpecies,
  createSpecies,
  updateSpecies,
  deleteSpecies,
} = require('../controllers/speciesController');

const router = express.Router();

router.use(protect);

router.get('/', listSpecies);
router.get('/:id', getSpecies);
router.post('/', authorize('admin'), createSpecies);
router.put('/:id', authorize('admin'), updateSpecies);
router.delete('/:id', authorize('admin'), deleteSpecies);

module.exports = router;
