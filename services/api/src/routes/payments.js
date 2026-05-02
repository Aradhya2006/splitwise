const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  generatePaymentLinks, 
  updateUpiId, 
  confirmPayment 
} = require('../controllers/paymentController');

router.post('/:billId/generate', protect, generatePaymentLinks);
router.post('/upi-id', protect, updateUpiId);
router.post('/:billId/confirm/:memberId', protect, confirmPayment);

module.exports = router;