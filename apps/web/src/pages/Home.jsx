import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [title, setTitle] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await api.get('/api/bills');
      setBills(res.data.bills || []);
    } catch (err) {
      console.error(err);
    }
  };

  const createBill = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/api/bills', { title });
      setShowNew(false);
      setTitle('');
      navigate(`/bill/${res.data.bill.id}`);
    } catch {
      alert('Failed to create bill');
    }
    setLoading(false);
  };

  const joinBill = async () => {
    if (!roomCode.trim()) return;
    navigate(`/join/${roomCode.toUpperCase()}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.greeting}>Hey, {user?.name} 👋</h1>
          <p style={styles.sub}>Ready to split some bills?</p>
        </div>
        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
      </div>

      <div style={styles.btnRow}>
        <button style={styles.newBillBtn} onClick={() => { setShowNew(!showNew); setShowJoin(false); }}>
          <span style={styles.plus}>+</span>
          <span style={styles.newBillText}>New Bill</span>
        </button>
        <button style={styles.joinBillBtn} onClick={() => { setShowJoin(!showJoin); setShowNew(false); }}>
          <span style={styles.plus}>⌘</span>
          <span style={styles.newBillText}>Join Bill</span>
        </button>
      </div>

      {showNew && (
        <div style={styles.formCard}>
          <p style={styles.formLabel}>Bill Title</p>
          <input
            style={styles.input}
            placeholder="e.g. Dinner at Pizza Hut"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createBill()}
          />
          <button style={styles.createBtn} onClick={createBill} disabled={loading}>
            {loading ? 'Creating...' : 'Create Bill →'}
          </button>
        </div>
      )}

      {showJoin && (
        <div style={styles.formCard}>
          <p style={styles.formLabel}>Enter Room Code</p>
          <input
            style={{...styles.input, textAlign: 'center', fontSize: 24, letterSpacing: 8}}
            placeholder="AB3X9Y"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            maxLength={6}
          />
          <button style={styles.createBtn} onClick={joinBill}>
            Join Bill →
          </button>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Your Bills</h2>
        {bills.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: 48 }}>🧾</span>
            <p style={styles.emptyText}>No bills yet</p>
            <p style={styles.emptySub}>Create or join a bill above</p>
          </div>
        ) : (
          bills.map(bill => (
            <div
              key={bill.id}
              style={styles.billCard}
              onClick={() => navigate(`/bill/${bill.id}`)}
            >
              <div>
                <p style={styles.billTitle}>{bill.title}</p>
                <p style={styles.billMeta}>₹{bill.total} • {bill.status}</p>
              </div>
              <span style={styles.arrow}>→</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0a0a0a', padding: 24, maxWidth: 600, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingTop: 24 },
  greeting: { color: '#fff', fontSize: 28, fontWeight: 'bold', margin: 0 },
  sub: { color: '#666', margin: '4px 0 0' },
  logoutBtn: { background: '#1a1a1a', color: '#aaa', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' },
  btnRow: { display: 'flex', gap: 12, marginBottom: 16 },
  newBillBtn: { flex: 1, background: '#4ec9b0', border: 'none', borderRadius: 16, padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  joinBillBtn: { flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  plus: { fontSize: 28, fontWeight: 'bold', color: '#000' },
  newBillText: { fontSize: 16, fontWeight: 'bold', color: '#000', marginTop: 4 },
  formCard: { background: '#1a1a1a', borderRadius: 16, padding: 24, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  formLabel: { color: '#aaa', fontSize: 13 },
  input: { background: '#2a2a2a', border: '1px solid #333', borderRadius: 10, padding: 14, color: '#fff', fontSize: 16, outline: 'none' },
  createBtn: { background: '#4ec9b0', color: '#000', border: 'none', borderRadius: 10, padding: 14, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  section: { marginTop: 24 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  emptyState: { textAlign: 'center', marginTop: 60 },
  emptyText: { color: '#aaa', fontSize: 18, fontWeight: '500' },
  emptySub: { color: '#555', fontSize: 13 },
  billCard: { background: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' },
  billTitle: { color: '#fff', fontSize: 16, fontWeight: '500', margin: 0 },
  billMeta: { color: '#666', fontSize: 13, marginTop: 4 },
  arrow: { color: '#4ec9b0', fontSize: 18 }
};