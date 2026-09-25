const express = require('express');
const { protect } = require('../middleware/auth');
const { listMine, markRead, markAllRead } = require('../controllers/notificationController');

const router = express.Router();
router.use(protect);

router.get('/', listMine);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);

module.exports = router;
