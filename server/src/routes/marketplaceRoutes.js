const express = require('express');
const { protect } = require('../middleware/auth');
const { listMarketplace, getMarketplaceProduct } = require('../controllers/productController');

const router = express.Router();
router.use(protect);

router.get('/products', listMarketplace);
router.get('/products/:id', getMarketplaceProduct);

module.exports = router;
