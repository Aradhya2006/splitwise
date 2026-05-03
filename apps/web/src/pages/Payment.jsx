import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Payment() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [payer, setPayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await api.post(`/api/payments/${billId}/generate`);
      setPayments(res.data.payments);
      setPayer(res.data.payer);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate payment links');
    }
    setLoading(false);
  };

  const confirmPayment = async (memberId) => {
    setConfirming(memberId);
    try {
      await api.post(`/api/payments/${billId}/confirm/${memberId}`);
      fetchPayments();
    } catch {
      alert('Failed to confirm payment');
    }
    setConfirming(null);
  };

  if (loading) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      Generating payment links...
    </div>
  );

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={() => navigate(-1)}>← Back</button>

      <h1 style={styles.title}>Payment</h1>
      <p style={styles.sub}>
        Everyone pays <strong style={{ color: '#4ec9b0' }}>{payer?.name}</strong> on UPI ID:{' '}
        <strong style={{ color: '#4ec9b0' }}>{payer?.upi_id}</strong>
      </p>

      {payments.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={{ fontSize: 48 }}>🎉</span>
          <p style={styles.emptyText}>All settled!</p>
          <p style={styles.emptySub}>Everyone has paid their share</p>
        </div>
      ) : (
        payments.map(payment => (
          <div key={payment.userId} style={styles.paymentCard}>
            <div style={styles.paymentHeader}>
              <div style={styles.avatar}>{payment.name[0]}</div>
              <div style={{ flex: 1 }}>
                <p style={styles.memberName}>{payment.name}</p>
                <p style={styles.memberPhone}>{payment.phone}</p>
              </div>
              <div style={styles.amountBadge}>₹{payment.amount}</div>
            </div>

            {/* QR Code */}
            {payment.qrCode && (
              <div style={styles.qrContainer}>
                <img src={payment.qrCode} alt="QR Code" style={styles.qrCode} />
                <p style={styles.qrHint}>Scan to pay via any UPI app</p>
              </div>
            )}

            {/* UPI Links */}
            <div style={styles.linkRow}>
              <a
                href={payment.upiLink}
                style={styles.upiBtn}
              >
                📱 Pay via UPI App
              </a>
              <button
                style={{
                  ...styles.confirmBtn,
                  background: payment.status === 'paid' ? '#1a3a2a' : '#4ec9b0',
                  color: payment.status === 'paid' ? '#4ec9b0' : '#000'
                }}
                onClick={() => confirmPayment(payment.userId)}
                disabled={payment.status === 'paid' || confirming === payment.userId}
              >
                {payment.status === 'paid' ? '✓ Paid' : confirming === payment.userId ? 'Confirming...' : 'Mark as Paid'}
              </button>
            </div>
          </div>
        ))
      )}

      <button style={styles.doneBtn} onClick={() => navigate('/home')}>
        Done → Back to Home
      </button>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0a0a0a', padding: 24, maxWidth: 600, margin: '0 auto' },
  back: { background: 'transparent', color: '#4ec9b0', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 24, paddingTop: 24, display: 'block' },
  title: { color: '#fff', fontSize: 32, fontWeight: 'bold', margin: '0 0 8px' },
  sub: { color: '#666', fontSize: 14, marginBottom: 24 },
  paymentCard: { background: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 16 },
  paymentHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: '#4ec9b0', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18, flexShrink: 0 },
  memberName: { color: '#fff', fontSize: 16, fontWeight: '500', margin: 0 },
  memberPhone: { color: '#666', fontSize: 13, margin: '2px 0 0' },
  amountBadge: { background: '#1a3a2a', color: '#4ec9b0', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', fontSize: 20 },
  qrContainer: { textAlign: 'center', margin: '16px 0' },
  qrCode: { width: 180, height: 180, borderRadius: 12, border: '3px solid #4ec9b0' },
  qrHint: { color: '#666', fontSize: 12, marginTop: 8 },
  linkRow: { display: 'flex', gap: 10 },
  upiBtn: { flex: 1, background: '#1a2a3a', color: '#4ec9b0', border: '1px solid #4ec9b0', borderRadius: 10, padding: 12, textAlign: 'center', textDecoration: 'none', fontSize: 14, fontWeight: '500' },
  confirmBtn: { flex: 1, border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 'bold', cursor: 'pointer' },
  emptyState: { textAlign: 'center', marginTop: 80 },
  emptyText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  emptySub: { color: '#666', fontSize: 14 },
  doneBtn: { background: '#1a1a1a', color: '#4ec9b0', border: '1px solid #4ec9b0', borderRadius: 12, padding: 16, width: '100%', fontSize: 16, cursor: 'pointer', marginTop: 8 }
};