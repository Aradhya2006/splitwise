const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createBill, addItem, getBill, addMember } = require('../controllers/billController');

router.post('/', protect, createBill);
router.get('/:billId', protect, getBill);
router.post('/:billId/items', protect, addItem);
router.post('/:billId/members', protect, addMember);

module.exports = router;