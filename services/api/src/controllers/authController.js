const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// In production this sends a real OTP via Twilio
// For now we use a fake OTP "123456" for testing
const sendOTP = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // TODO: integrate Twilio here later
  console.log(`OTP 123456 sent to ${phone}`);

  res.json({ 
    message: 'OTP sent successfully',
    // Remove this in production:
    debug_otp: '123456' 
  });
};

const verifyOTP = async (req, res) => {
  const { phone, otp, name } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  // Fake OTP check for now
  if (otp !== '123456') {
    return res.status(401).json({ error: 'Invalid OTP' });
  }

  try {
    // Check if user exists
    let result = await pool.query(
      'SELECT * FROM users WHERE phone = $1', 
      [phone]
    );

    let user = result.rows[0];

    // If new user, create them
    if (!user) {
      result = await pool.query(
        'INSERT INTO users (name, phone) VALUES ($1, $2) RETURNING *',
        [name || 'User', phone]
      );
      user = result.rows[0];
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        upi_id: user.upi_id
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { sendOTP, verifyOTP };