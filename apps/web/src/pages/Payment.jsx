import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Payment() {
  const { user } = useAuth();
  const { billId } = useParams();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [payer, setPayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await api.post(`/api/payments/${billId}/generate`);
      setPayments(res.data.payments);
      setPayer(res.data.payer);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate payment links');
    }
    setLoading(false);
  }, [billId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

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

  const displayPayments = user?.id === payer?.id
    ? payments
    : payments.filter(p => p.userId === user?.id);

  return (
    <>
      <div className="bg-glow"></div>
      <div className="bg-glow-2"></div>
      <div style={styles.container} className="animate-slide-up">
        <button style={styles.back} onClick={() => navigate(-1)}>Back</button>

        <h1 style={styles.title}>Payment</h1>
        <p style={styles.sub}>
          {user?.id === payer?.id ? 'Everyone pays you' : 'You pay'}{' '}
          <strong style={{ color: 'var(--primary)' }}>{payer?.name}</strong> on UPI ID:{' '}
          <strong style={{ color: 'var(--primary)' }}>{payer?.upi_id}</strong>
        </p>

        {displayPayments.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>All settled! 🎉</p>
            <p style={styles.emptySub}>Everyone has paid their share.</p>
          </div>
        ) : (
          displayPayments.map((payment, i) => (
            <div key={payment.userId} className="glass-panel animate-slide-up" style={{ ...styles.paymentCard, animationDelay: `${0.1 * i}s` }}>
              <div style={styles.paymentHeader}>
                <div style={styles.avatar}>{payment.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <p style={styles.memberName}>{payment.name}</p>
                  <p style={styles.memberPhone}>{payment.phone}</p>
                </div>
                <div style={styles.amountBadge}>₹{payment.amount}</div>
              </div>

              {payment.qrCode && (
                <div style={styles.qrContainer}>
                  <img src={payment.qrCode} alt="QR Code" style={styles.qrCode} />
                  <p style={styles.qrHint}>Scan to pay via any UPI app</p>
                </div>
              )}

              <div style={styles.linkRow}>
                <a href={payment.upiLink} style={styles.upiBtn}>
                  Pay via UPI App
                </a>
                {user?.id === payer?.id && (
                  <button
                    style={{
                      ...styles.confirmBtn,
                      background: payment.status === 'paid' ? 'rgba(0, 240, 181, 0.1)' : 'var(--primary)',
                      color: payment.status === 'paid' ? 'var(--primary)' : '#000',
                      border: payment.status === 'paid' ? '1px solid rgba(0, 240, 181, 0.2)' : 'none'
                    }}
                    onClick={() => confirmPayment(payment.userId)}
                    disabled={payment.status === 'paid' || confirming === payment.userId}
                  >
                    {payment.status === 'paid' ? 'Paid ✓' : confirming === payment.userId ? 'Confirming...' : 'Mark as Paid'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        <button style={styles.doneBtn} onClick={() => navigate('/home')}>
          Return to Dashboard
        </button>
      </div>
    </>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: '24px 24px 80px', maxWidth: 640, margin: '0 auto' },
  back: { background: 'transparent', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 24, paddingTop: 24, display: 'block', fontWeight: '600' },
  title: { color: 'var(--text-main)', fontSize: 36, fontWeight: '800', margin: '0 0 8px', letterSpacing: '-1px' },
  sub: { color: 'var(--text-muted)', fontSize: 15, marginBottom: 32, fontWeight: '500' },
  paymentCard: { padding: 24, marginBottom: 24 },
  paymentHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: { width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: 20, flexShrink: 0 },
  memberName: { color: 'var(--text-main)', fontSize: 18, fontWeight: '700', margin: 0 },
  memberPhone: { color: 'var(--text-muted)', fontSize: 14, margin: '2px 0 0', fontWeight: '500' },
  amountBadge: { background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '10px 20px', borderRadius: 12, fontWeight: '800', fontSize: 22, border: '1px solid rgba(99, 102, 241, 0.2)' },
  qrContainer: { textAlign: 'center', margin: '24px 0', padding: 32, background: '#F8FAFC', borderRadius: 24, border: '1px solid #E2E8F0' },
  qrCode: { width: 220, height: 220, borderRadius: 16, border: '4px solid var(--primary)', padding: 12, background: '#fff' },
  qrHint: { color: 'var(--text-muted)', fontSize: 13, marginTop: 16, fontWeight: '600' },
  linkRow: { display: 'flex', gap: 12 },
  upiBtn: { flex: 1, background: '#F1F5F9', color: 'var(--text-main)', borderRadius: 14, padding: 16, textAlign: 'center', textDecoration: 'none', fontSize: 15, fontWeight: '700' },
  confirmBtn: { flex: 1, border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' },
  emptyState: { textAlign: 'center', padding: 60 },
  emptyText: { color: 'var(--text-main)', fontSize: 28, fontWeight: '800', marginTop: 16, letterSpacing: '-0.5px' },
  emptySub: { color: 'var(--text-muted)', fontSize: 16, fontWeight: '500', marginTop: 8 },
  doneBtn: { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 20, padding: 20, width: '100%', fontSize: 16, fontWeight: '800', cursor: 'pointer', marginTop: 24, boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' }
};