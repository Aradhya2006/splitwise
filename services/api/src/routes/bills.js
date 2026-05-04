const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createBill, addItem, getBill, addMember, getUserBills, deleteItem, deleteBill, joinBill } = require('../controllers/billController');

router.get('/', protect, getUserBills);
router.post('/', protect, createBill);
router.post('/join', protect, joinBill);
router.get('/:billId', protect, getBill);
router.delete('/:billId', protect, deleteBill);
router.post('/:billId/items', protect, addItem);
router.post('/:billId/members', protect, addMember);
router.delete('/:billId/items/:itemId', protect, deleteItem);

module.exports = router;