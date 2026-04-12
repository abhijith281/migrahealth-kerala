const express = require('express');
const router = express.Router();
const { translateText, translateBatch } = require('../controllers/translateController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', translateText);
router.post('/batch', translateBatch);

module.exports = router;
