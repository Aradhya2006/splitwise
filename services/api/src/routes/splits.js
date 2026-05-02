const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { calculateSplits, getSplitSummary } = require('../controllers/splitController');

router.post('/:billId/calculate', protect, calculateSplits);
router.get('/:billId/summary', protect, getSplitSummary);

module.exports = router;