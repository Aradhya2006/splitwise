const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { calculateSplits, getSplitSummary, getItemSplits } = require('../controllers/splitController');

router.post('/:billId/calculate', protect, calculateSplits);
router.get('/:billId/summary', protect, getSplitSummary);
router.get('/:billId/items', protect, getItemSplits);

module.exports = router;