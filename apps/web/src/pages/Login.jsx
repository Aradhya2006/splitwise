import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const sendOTP = async () => {
    if (phone.length !== 10) { setError('Enter valid 10-digit number'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/send-otp', { phone });
      setStep('otp');
    } catch {
      setError('Failed to send OTP');
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    setLoading(true);
    setError('');
    const result = await login(phone, otp, name);
    if (result.success) {
      navigate('/home');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Split.ai</h1>
        <p style={styles.tagline}>Split bills. Not friendships.</p>

        {error && <div style={styles.error}>{error}</div>}

        {step === 'phone' ? (
          <>
            <input
              style={styles.input}
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <div style={styles.phoneRow}>
              <span style={styles.code}>+91</span>
              <input
                style={{...styles.input, flex: 1}}
                placeholder="10-digit phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                maxLength={10}
              />
            </div>
            <button style={styles.btn} onClick={sendOTP} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP →'}
            </button>
          </>
        ) : (
          <>
            <p style={styles.hint}>Enter OTP for +91 {phone}</p>
            <input
              style={{...styles.input, textAlign: 'center', fontSize: 24, letterSpacing: 8}}
              placeholder="123456"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
            />
            <p style={styles.hint}>Use 123456 for testing</p>
            <button style={styles.btn} onClick={verifyOTP} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login →'}
            </button>
            <button style={styles.backBtn} onClick={() => setStep('phone')}>
              ← Change number
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', background: '#0a0a0a',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  card: {
    background: '#1a1a1a', borderRadius: 16, padding: 40,
    width: '100%', maxWidth: 400, display: 'flex',
    flexDirection: 'column', gap: 12
  },
  logo: { color: '#4ec9b0', fontSize: 42, fontWeight: 'bold', textAlign: 'center', margin: 0 },
  tagline: { color: '#666', textAlign: 'center', marginBottom: 16 },
  input: {
    background: '#2a2a2a', border: '1px solid #333', borderRadius: 10,
    padding: 14, color: '#fff', fontSize: 16, width: '100%',
    boxSizing: 'border-box', outline: 'none'
  },
  phoneRow: { display: 'flex', gap: 10, alignItems: 'center' },
  code: {
    background: '#2a2a2a', border: '1px solid #333', borderRadius: 10,
    padding: 14, color: '#fff', fontSize: 16
  },
  btn: {
    background: '#4ec9b0', color: '#000', border: 'none',
    borderRadius: 10, padding: 16, fontSize: 16,
    fontWeight: 'bold', cursor: 'pointer', width: '100%'
  },
  backBtn: {
    background: 'transparent', color: '#4ec9b0', border: 'none',
    cursor: 'pointer', fontSize: 14
  },
  error: {
    background: '#2a1a1a', color: '#f44747', padding: 10,
    borderRadius: 8, fontSize: 13
  },
  hint: { color: '#666', fontSize: 13, textAlign: 'center' }
};
