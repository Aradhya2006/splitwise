const pool = require('../config/db');
const QRCode = require('qrcode');

// Generate UPI payment links for all members of a bill
const generatePaymentLinks = async (req, res) => {
  const { billId } = req.params;
  const payerId = req.user.userId;

  try {
    // Get payer details
    const payerResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [payerId]
    );
    const payer = payerResult.rows[0];

    if (!payer.upi_id) {
      return res.status(400).json({ 
        error: 'Please add your UPI ID first. Others will pay you on this ID.' 
      });
    }

    // Get all members and their amounts
    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.phone, u.upi_id,
              bm.amount_owed, bm.status
       FROM bill_members bm
       JOIN users u ON bm.user_id = u.id
       WHERE bm.bill_id = $1 AND bm.user_id != $2`,
      [billId, payerId]
    );

    const bill = await pool.query(
      'SELECT title FROM bills WHERE id = $1',
      [billId]
    );
    const billTitle = bill.rows[0].title;

    // Generate UPI link for each member
    const paymentLinks = [];

    for (const member of membersResult.rows) {
      const amount = parseFloat(member.amount_owed).toFixed(2);
      const note = `Split.ai - ${billTitle}`;

      // UPI deep link — opens GPay/PhonePe/Paytm
      const upiLink = `upi://pay?pa=${payer.upi_id}&pn=${encodeURIComponent(payer.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

      // Also generate a web fallback link
      const webLink = `https://upi.razorpay.com/pay?pa=${payer.upi_id}&pn=${encodeURIComponent(payer.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

      // Generate QR code
      const qrCode = await QRCode.toDataURL(upiLink);

      // Save payment record
      await pool.query(
        `INSERT INTO payments (bill_id, payer_id, payee_id, amount, status)
         VALUES ($1, $2, $3, $4, 'pending')
         ON CONFLICT DO NOTHING`,
        [billId, member.id, payerId, amount]
      );

      paymentLinks.push({
        userId: member.id,
        name: member.name,
        phone: member.phone,
        amount: parseFloat(amount),
        upiLink,
        webLink,
        qrCode,
        status: member.status
      });
    }

    res.json({
      message: 'Payment links generated',
      payer: {
        name: payer.name,
        upi_id: payer.upi_id
      },
      payments: paymentLinks
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update payer's UPI ID
const updateUpiId = async (req, res) => {
  const { upiId } = req.body;
  const userId = req.user.userId;

  if (!upiId) {
    return res.status(400).json({ error: 'UPI ID is required' });
  }

  // Basic UPI ID validation
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
  if (!upiRegex.test(upiId)) {
    return res.status(400).json({ 
      error: 'Invalid UPI ID format. Example: name@okaxis' 
    });
  }

  try {
    await pool.query(
      'UPDATE users SET upi_id = $1 WHERE id = $2',
      [upiId, userId]
    );

    res.json({ 
      message: 'UPI ID updated successfully',
      upi_id: upiId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark payment as done (manual confirmation for now)
const confirmPayment = async (req, res) => {
  const { billId, memberId } = req.params;

  try {
    // Update payment status
    await pool.query(
      `UPDATE payments SET status = 'success', paid_at = NOW()
       WHERE bill_id = $1 AND payer_id = $2`,
      [billId, memberId]
    );

    // Update bill member status
    await pool.query(
      `UPDATE bill_members SET status = 'paid', amount_paid = amount_owed
       WHERE bill_id = $1 AND user_id = $2`,
      [billId, memberId]
    );

    // Check if all members paid
    const unpaidResult = await pool.query(
      `SELECT COUNT(*) as unpaid FROM bill_members 
       WHERE bill_id = $1 AND status != 'paid'`,
      [billId]
    );

    const allPaid = parseInt(unpaidResult.rows[0].unpaid) === 0;

    if (allPaid) {
      await pool.query(
        `UPDATE bills SET status = 'settled' WHERE id = $1`,
        [billId]
      );
    }

    res.json({ 
      message: 'Payment confirmed',
      allPaid
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { generatePaymentLinks, updateUpiId, confirmPayment };