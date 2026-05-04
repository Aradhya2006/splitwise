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
    <>
      <div className="bg-glow"></div>
      <div className="bg-glow-2"></div>
      <div style={styles.container}>
        <div className="glass-panel animate-slide-up" style={styles.card}>
          <h1 style={styles.logo}>Split.ai</h1>
          <p style={styles.tagline}>Split bills, not friendships.</p>

          {error && <div style={styles.error}>{error}</div>}

          {step === 'phone' ? (
            <div className="animate-slide-up animate-delay-1" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div className="animate-slide-up animate-delay-1" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                {loading ? 'Verifying...' : 'Verify and Login'}
              </button>
              <button style={styles.backBtn} onClick={() => setStep('phone')}>
                Change number
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24
  },
  card: {
    padding: '48px 40px',
    width: '100%', maxWidth: 440, display: 'flex',
    flexDirection: 'column', gap: 16
  },
  logo: { fontSize: 56, fontWeight: '800', textAlign: 'center', margin: 0, color: 'var(--primary)', letterSpacing: '-2px' },
  tagline: { color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24, fontSize: 16, fontWeight: '500' },
  input: {
    background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14,
    padding: 16, color: 'var(--text-main)', fontSize: 16, width: '100%',
    boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s'
  },
  phoneRow: { display: 'flex', gap: 12, alignItems: 'center' },
  code: {
    background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14,
    padding: 16, color: 'var(--text-main)', fontSize: 16, fontWeight: '600'
  },
  btn: {
    background: 'var(--primary)', color: '#fff', border: 'none',
    borderRadius: 14, padding: 18, fontSize: 16,
    fontWeight: '800', cursor: 'pointer', width: '100%',
    boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)'
  },
  backBtn: {
    background: 'transparent', color: 'var(--primary)', border: 'none',
    cursor: 'pointer', fontSize: 14, fontWeight: '700'
  },
  error: {
    background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', padding: 12,
    borderRadius: 10, fontSize: 14, border: '1px solid rgba(239, 68, 68, 0.1)', textAlign: 'center'
  },
  hint: { color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', fontWeight: '500' }
};
