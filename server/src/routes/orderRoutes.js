const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { listOrders, getOrder, createOrder, acceptOrder, declineOrder, cancelOrder, completeOrder } = require('../controllers/orderController');

const router = express.Router();
router.use(protect);

router.get('/', authorize('buyer', 'fishpond_owner'), listOrders);
router.post('/', authorize('buyer'), createOrder);
router.get('/:id', getOrder);
router.patch('/:id/accept', authorize('fishpond_owner'), acceptOrder);
router.patch('/:id/decline', authorize('fishpond_owner'), declineOrder);
router.patch('/:id/complete', authorize('fishpond_owner'), completeOrder);
router.patch('/:id/cancel', authorize('buyer', 'fishpond_owner'), cancelOrder);

module.exports = router;
