const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const twilio = require('twilio');

const twilioClient = process.env.TWILIO_ACCOUNT_SID ? twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
) : null;

// In-memory fallback if Redis is not available
const tempOtps = new Map();

// In production this sends a real OTP via Twilio
// For now we use a fake OTP "123456" for testing
const sendOTP = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Generate random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Store OTP in Redis for 5 minutes
    try {
      await redis.set(`otp:${phone}`, otp, { EX: 300 });
    } catch (redisErr) {
      console.warn('Redis unavailable, using in-memory fallback');
      tempOtps.set(phone, otp);
      setTimeout(() => tempOtps.delete(phone), 300000); // 5 min expiry
    }

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        body: `Your Split.ai verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone.startsWith('+') ? phone : `+91${phone}`
      });
      console.log(`Real OTP ${otp} sent to ${phone}`);
    } else {
      console.log(`[TEST MODE] Real OTP ${otp} generated for ${phone} (Twilio not configured)`);
    }

    res.json({ 
      message: 'OTP sent successfully',
      debug_otp: !twilioClient ? otp : undefined
    });

  } catch (err) {
    console.error('Failed to send OTP:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyOTP = async (req, res) => {
  const { phone, otp, name } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  try {
    // Check OTP from Redis or Memory Fallback
    let storedOtp = null;
    try {
      storedOtp = await redis.get(`otp:${phone}`);
    } catch (redisErr) {
      storedOtp = tempOtps.get(phone);
    }

    if (!storedOtp || storedOtp !== otp) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Delete OTP after successful verification
    try {
      await redis.del(`otp:${phone}`);
    } catch (redisErr) {
      tempOtps.delete(phone);
    }
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