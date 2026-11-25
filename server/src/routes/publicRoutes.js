const express = require('express');
const rateLimit = require('express-rate-limit');
const { verify } = require('../controllers/publicController');

const router = express.Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));

router.get('/verify/:code', verify);

module.exports = router;
