const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { listMyProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

const router = express.Router();
router.use(protect, authorize('fishpond_owner'));

router.get('/', listMyProducts);
router.post('/', upload.single('image'), createProduct);
router.put('/:id', upload.single('image'), updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
