import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Home() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [title, setTitle] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [dashboardStats, setDashboardStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('pending');

  const fetchBills = useCallback(async () => {
    try {
      const res = await api.get('/api/bills');
      setBills(res.data.bills || []);
      setDashboardStats(res.data.dashboardStats || {});
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

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
    setLoading(true);
    try {
      const res = await api.post('/api/bills/join', { roomCode: roomCode.trim().toUpperCase() });
      setShowJoin(false);
      setRoomCode('');
      fetchBills();
      navigate(`/bill/${res.data.billId}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join bill');
    }
    setLoading(false);
  };

  const handleEditUpi = async () => {
    const newUpi = window.prompt("Enter your UPI ID (e.g., name@okaxis):", user?.upi_id || "");
    if (newUpi && newUpi.trim()) {
      try {
        await api.post('/api/payments/upi-id', { upiId: newUpi.trim() });
        updateUser({ upi_id: newUpi.trim() });
        alert("UPI ID saved successfully!");
      } catch (err) {
        alert(err.response?.data?.error || "Failed to update UPI ID");
      }
    }
  };

  const filteredBills = bills.filter(b => {
    // Use loose equality (==) in case Postgres returns the ID as a string
    const isCreator = b.created_by == user?.id;
    if (filterType === 'draft') return b.status === 'draft';
    if (filterType === 'pending') {
      return b.status !== 'draft' && (isCreator ? b.status !== 'settled' : b.user_status !== 'paid');
    }
    if (filterType === 'settled') {
      return isCreator ? b.status === 'settled' : b.user_status === 'paid';
    }
    return true;
  });

  return (
    <>
      <div className="bg-glow"></div>
      <div className="bg-glow-2"></div>
      <div style={styles.container} className="animate-slide-up">
        <div style={styles.header}>
          <div>
            <h1 style={styles.greeting}>Welcome back, {user?.name}</h1>
            {user?.upi_id ? (
              <p style={styles.sub}>
                UPI ID: <span style={{ color: 'var(--primary)' }}>{user.upi_id}</span>
                <button style={styles.editUpiBtn} onClick={handleEditUpi}>Edit</button>
              </p>
            ) : (
              <p style={styles.sub}>
                <button style={styles.addUpiBtn} onClick={handleEditUpi}>Add UPI ID</button>
              </p>
            )}
          </div>
          <button style={styles.logoutBtn} onClick={logout}>Log Out</button>
        </div>

        <div 
          className="glass-panel"
          style={{...styles.dashboardCard, cursor: 'pointer'}}
          onClick={() => {
            setFilterType('pending');
            document.getElementById('bills-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <p style={styles.dashboardLabel}>Amount Pending to Settle</p>
          <h2 style={styles.dashboardAmount}>₹{dashboardStats.totalPending || '0.00'}</h2>
        </div>

        <div style={styles.btnRow} className="animate-slide-up animate-delay-1">
        <button style={styles.newBillBtn} onClick={() => { setShowNew(!showNew); setShowJoin(false); }}>
          <span style={styles.newBillText}>Create New Bill</span>
        </button>
        <button style={styles.joinBillBtn} onClick={() => { setShowJoin(!showJoin); setShowNew(false); }}>
          <span style={styles.newBillText}>Join via Code</span>
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
            {loading ? 'Creating...' : 'Create Bill'}
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
            Join Bill
          </button>
        </div>
      )}

      <div id="bills-section" style={styles.section} className="animate-slide-up animate-delay-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={styles.sectionTitle}>Your Bills</h2>
          <div style={styles.tabContainer}>
            <button 
              style={{...styles.tabBtn, ...(filterType === 'draft' ? styles.tabActive : {})}} 
              onClick={() => setFilterType('draft')}
            >
              Drafts
            </button>
            <button 
              style={{...styles.tabBtn, ...(filterType === 'pending' ? styles.tabActive : {})}} 
              onClick={() => setFilterType('pending')}
            >
              Pending
            </button>
            <button 
              style={{...styles.tabBtn, ...(filterType === 'settled' ? styles.tabActive : {})}} 
              onClick={() => setFilterType('settled')}
            >
              Settled
            </button>
          </div>
        </div>
        
        {filteredBills.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No {filterType} bills</p>
            <p style={styles.emptySub}>Your bills will appear here once created or joined.</p>
          </div>
        ) : (
          <div style={styles.billList}>
            {filteredBills.map((bill, i) => (
              <div
                key={bill.id}
                className="glass-panel animate-slide-up"
                style={{ ...styles.billCard, animationDelay: `${0.1 * i}s` }}
                onClick={() => navigate(`/bill/${bill.id}`)}
              >
                <div>
                  <p style={styles.billTitle}>{bill.title}</p>
                  <p style={styles.billMeta}>₹{bill.total} • {bill.status.toUpperCase()}</p>
                </div>
                <div style={styles.arrowContainer}>
                  <span style={styles.arrow}>Open</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: '24px 24px 80px', maxWidth: 640, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingTop: 24 },
  greeting: { fontSize: 32, fontWeight: '800', margin: 0, color: 'var(--text-main)', letterSpacing: '-0.5px' },
  sub: { color: 'var(--text-muted)', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: '500' },
  editUpiBtn: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--surface-border)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12 },
  addUpiBtn: { background: 'rgba(99, 102, 241, 0.05)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.1)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: '600' },
  logoutBtn: { background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 12, padding: '8px 16px', cursor: 'pointer', fontWeight: '600' },
  dashboardCard: { padding: 32, marginBottom: 32, textAlign: 'center', position: 'relative', overflow: 'hidden' },
  dashboardLabel: { color: 'var(--text-muted)', fontSize: 15, margin: '0 0 12px', fontWeight: '500' },
  dashboardAmount: { color: 'var(--primary)', fontSize: 56, margin: 0, fontWeight: '800', letterSpacing: '-2px' },
  btnRow: { display: 'flex', gap: 16, marginBottom: 32 },
  newBillBtn: { flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 16, padding: '20px 24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)', transition: 'transform 0.1s' },
  joinBillBtn: { flex: 1, background: 'var(--surface)', color: 'var(--text-main)', border: '1px solid var(--surface-border)', borderRadius: 16, padding: '20px 24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  newBillText: { fontSize: 15, fontWeight: '700' },
  formCard: { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 20, padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' },
  formLabel: { color: 'var(--text-muted)', fontSize: 14, fontWeight: '600' },
  input: { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, color: 'var(--text-main)', fontSize: 16, outline: 'none', transition: 'border-color 0.2s', width: '100%' },
  createBtn: { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: '700', cursor: 'pointer', marginTop: 8 },
  section: { marginTop: 40 },
  sectionTitle: { color: 'var(--text-main)', fontSize: 24, fontWeight: '700', margin: 0, letterSpacing: '-0.5px' },
  tabContainer: { display: 'flex', background: '#F1F5F9', borderRadius: 12, padding: 4 },
  tabBtn: { background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: '600' },
  tabActive: { background: 'var(--surface)', color: 'var(--text-main)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  emptyState: { textAlign: 'center', marginTop: 80, opacity: 0.8 },
  emptyText: { color: 'var(--text-main)', fontSize: 20, fontWeight: '600', marginTop: 16 },
  emptySub: { color: 'var(--text-muted)', fontSize: 15, marginTop: 8 },
  billList: { display: 'flex', flexDirection: 'column', gap: 12 },
  billCard: { padding: 20, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  billTitle: { color: 'var(--text-main)', fontSize: 18, fontWeight: '600', margin: 0, letterSpacing: '-0.3px' },
  billMeta: { color: 'var(--text-muted)', fontSize: 14, marginTop: 8, fontWeight: '500' },
  arrowContainer: { padding: '6px 12px', borderRadius: 8, background: 'rgba(99, 102, 241, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  arrow: { color: 'var(--primary)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }
};