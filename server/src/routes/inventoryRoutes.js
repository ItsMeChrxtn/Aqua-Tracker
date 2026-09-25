const express = require('express');
const { protect } = require('../middleware/auth');
const { listForFishpond, createItem, updateItem, adjustStock, removeItem } = require('../controllers/inventoryController');

const router = express.Router();
router.use(protect);

router.get('/fishponds/:fishpondId/inventory', listForFishpond);
router.post('/fishponds/:fishpondId/inventory', createItem);
router.put('/inventory/:id', updateItem);
router.patch('/inventory/:id/adjust', adjustStock);
router.delete('/inventory/:id', removeItem);

module.exports = router;
