const axios = require('axios');

const API_URL = 'http://localhost:5000/api/auth';

async function testRegistration() {
  const phone = '9999999999';
  const name = 'Test User';

  try {
    console.log('Sending OTP...');
    const sendRes = await axios.post(`${API_URL}/send-otp`, { phone });
    console.log('Send OTP response:', sendRes.data);

    const otp = sendRes.data.debug_otp;
    if (!otp) {
      console.log('No debug OTP returned. Is Twilio configured?');
      return;
    }

    console.log(`Verifying OTP: ${otp}...`);
    const verifyRes = await axios.post(`${API_URL}/verify-otp`, { phone, otp, name });
    console.log('Verify OTP response:', verifyRes.data);

  } catch (err) {
    console.error('Error during registration:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

testRegistration();
