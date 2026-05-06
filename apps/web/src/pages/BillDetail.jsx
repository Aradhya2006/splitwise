import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function BillDetail() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [memberPhone, setMemberPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [assignments, setAssignments] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchBill = useCallback(async () => {
    try {
      const res = await api.get(`/api/bills/${billId}`);
      setBill(res.data.bill);
      setItems(res.data.items);
      setMembers(res.data.members);
      setRoomCode(res.data.room_code);

      // Load existing splits
      const splitsRes = await api.get(`/api/splits/${billId}/items`);
      if (splitsRes.data.splits) {
        const loadedAssignments = {};
        splitsRes.data.splits.forEach(split => {
          if (!loadedAssignments[split.item_id]) {
            loadedAssignments[split.item_id] = [];
          }
          const existing = loadedAssignments[split.item_id].find(a => a.memberId === split.user_id);
          if (existing) {
            existing.percentage += parseFloat(split.percentage);
          } else {
            loadedAssignments[split.item_id].push({
              memberId: split.user_id,
              percentage: parseFloat(split.percentage)
            });
          }
        });
        setAssignments(loadedAssignments);
      }
    } catch (err) { console.error(err); }
  }, [billId]);

  useEffect(() => { fetchBill(); }, [fetchBill]);

  const addItem = async () => {
    if (!itemName || !itemPrice) return;
    setLoading(true);
    try {
      await api.post(`/api/bills/${billId}/items`, {
        name: itemName, price: parseFloat(itemPrice), quantity: parseInt(itemQty)
      });
      setItemName(''); setItemPrice(''); setItemQty('1');
      fetchBill();
    } catch { alert('Failed to add item'); }
    setLoading(false);
  };

  const deleteItem = async (itemId) => {
    try {
      await api.delete(`/api/bills/${billId}/items/${itemId}`);
      fetchBill();
    } catch { alert('Failed to delete item'); }
  };

  const addMember = async () => {
    if (!memberPhone) return;
    try {
      await api.post(`/api/bills/${billId}/members`, { phone: memberPhone });
      setMemberPhone('');
      fetchBill();
    } catch (err) { alert(err.response?.data?.error || 'Failed to add member'); }
  };

const shareRoomCode = () => {
  const joinLink = `${window.location.origin}/join/${roomCode}`;
  const text = `Join my Split.ai bill "${bill?.title}"!\nRoom code: ${roomCode}\nLink: ${joinLink}`;
  if (navigator.share) {
    navigator.share({ title: 'Split.ai', text, url: joinLink });
  } else {
    navigator.clipboard.writeText(text);
    alert('Room code & link copied to clipboard!');
  }
};

const addFromContacts = async () => {
  if (!('contacts' in navigator && 'ContactsManager' in window)) {
    alert('Contact selection is not supported on this browser. Try on mobile Chrome.');
    return;
  }
  try {
    const props = ['name', 'tel'];
    const contacts = await navigator.contacts.select(props, { multiple: true });
    let addedCount = 0;
    
    setLoading(true);
    for (const contact of contacts) {
      if (contact.tel && contact.tel.length > 0) {
        let rawPhone = contact.tel[0].replace(/\D/g, '');
        if (rawPhone.length >= 10) {
          const phone = rawPhone.slice(-10);
          try {
            await api.post(`/api/bills/${billId}/members`, { phone });
            addedCount++;
          } catch (err) {
            console.warn('Failed to add phone', phone, err);
          }
        }
      }
    }
    setLoading(false);
    
    if (addedCount > 0) {
      fetchBill();
      alert(`Successfully added ${addedCount} contact(s)!`);
    } else {
      alert('No valid contacts were selected or they need to sign up first.');
    }
  } catch (ex) {
    console.error(ex);
    setLoading(false);
  }
};

const settleBill = async () => {
  try {
    await api.post(`/api/payments/${billId}/generate`);
    navigate(`/payment/${billId}`);
  } catch (err) {
    if (err.response?.status === 400 && err.response.data.error.includes('UPI ID')) {
      const upi = window.prompt("Please enter your UPI ID to receive payments (e.g., yourname@okaxis):");
      if (upi && upi.trim()) {
        try {
           await api.post('/api/payments/upi-id', { upiId: upi.trim() });
           await api.post(`/api/payments/${billId}/generate`);
           navigate(`/payment/${billId}`);
        } catch(e) {
           alert(e.response?.data?.error || "Failed to save UPI ID or generate payments.");
        }
      }
    } else {
      alert(err.response?.data?.error || 'Please add your UPI ID first');
    }
  }
};
  const scanBill = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:8000/parse-bill', {
        method: 'POST', body: formData
      });
      const data = await res.json();
      for (const item of data.items) {
        await api.post(`/api/bills/${billId}/items`, {
          name: item.name, price: item.price, quantity: item.quantity
        });
      }
      fetchBill();
      alert(`Scanned ${data.items.length} items!`);
    } catch { alert('Failed to scan bill'); }
    setScanning(false);
  };

  // Handle item assignment
  const toggleAssignment = (itemId, memberId) => {
    setAssignments(prev => {
      const key = `${itemId}`;
      const current = prev[key] || [];
      const exists = current.find(a => a.memberId === memberId);
      
      if (exists) {
        // Remove this member from item
        const updated = current.filter(a => a.memberId !== memberId);
        return { ...prev, [key]: updated };
      } else {
        // Add member and recalculate equal split
        const updated = [...current, { memberId }];
        const pct = Math.floor(100 / updated.length);
        const remainder = 100 - (pct * updated.length);
        return {
          ...prev,
          [key]: updated.map((a, i) => ({
            ...a,
            percentage: i === 0 ? pct + remainder : pct
          }))
        };
      }
    });
  };

  const isAssigned = (itemId, memberId) => {
    const current = assignments[itemId] || [];
    return current.find(a => a.memberId === memberId);
  };

  const getItemSplit = (itemId) => assignments[itemId] || [];

  const calculateMemberTotal = (memberId) => {
    let total = 0;
    items.forEach(item => {
      const split = assignments[item.id] || [];
      const assignment = split.find(a => a.memberId === memberId);
      if (assignment) {
        total += (parseFloat(item.price) * item.quantity * assignment.percentage) / 100;
      }
    });
    return total.toFixed(2);
  };

  const deleteBill = async () => {
    if (window.confirm('Are you sure you want to delete this bill? This cannot be undone.')) {
      try {
        await api.delete(`/api/bills/${billId}`);
        navigate('/home');
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete bill');
      }
    }
  };

  const saveSplits = async () => {
  try {
    const splits = items.map(item => ({
      itemId: item.id,
      assignments: (assignments[item.id] || []).map(a => ({
        userId: a.memberId,
        percentage: a.percentage
      }))
    })).filter(s => s.assignments.length > 0);

    await api.post(`/api/splits/${billId}/calculate`, {
      splits,
      tax: { cgst: parseFloat(bill.cgst), sgst: parseFloat(bill.sgst), serviceCharge: parseFloat(bill.service_charge) },
      discount: { type: bill.discount_type || 'none', amount: parseFloat(bill.discount_amount) }
    });

    navigate(`/payment/${billId}`);
  } catch {
    alert('Failed to save splits');
  }
};

  if (!bill) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      Loading...
    </div>
  );

  return (
    <>
      <div className="bg-glow"></div>
      <div className="bg-glow-2"></div>
      <div style={styles.container} className="animate-slide-up">
        <button style={styles.back} onClick={() => navigate('/home')}>Back to Dashboard</button>

      <div style={styles.billHeader}>
        <h1 style={styles.billTitle}>{bill.title}</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={styles.totalBadge}>₹{bill.total}</div>
          {user?.id === bill.created_by && (
            <button style={styles.deleteBillBtn} onClick={deleteBill}>Delete Bill</button>
          )}
        </div>
      </div>

      {/* Room Code */}
      <div className="glass-panel animate-slide-up animate-delay-1" style={styles.roomCard}>
  <p style={styles.roomLabel}>Room Code</p>
  <p style={styles.roomCode}>{roomCode}</p>
  <button style={styles.shareBtn} onClick={shareRoomCode}>Copy Invite Link</button>
  {bill.status !== 'settled' && (
    <button style={styles.settleBtn} onClick={settleBill}>
      Generate Payment Summary
    </button>
  )}
  {bill.status === 'settled' && (
    <div style={styles.settledBadge}>Bill Settled</div>
  )}
</div>

      {/* Scan Bill */}
      <div className="glass-panel animate-slide-up animate-delay-2" style={styles.card}>
        <p style={styles.cardTitle}>Scan Bill Photo</p>
        <label style={styles.uploadBtn}>
          {scanning ? 'Scanning...' : 'Upload Bill Image'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={scanBill} disabled={scanning} />
        </label>
        <p style={styles.uploadHint}>AI will automatically extract items and prices</p>
      </div>

      {/* Add Item */}
      <div className="glass-panel animate-slide-up animate-delay-3" style={styles.card}>
        <p style={styles.cardTitle}>Add Item Manually</p>
        <div style={styles.row}>
          <input style={{...styles.input, flex: 2}} placeholder="Item name" value={itemName} onChange={e => setItemName(e.target.value)} />
          <input style={{...styles.input, flex: 1}} placeholder="₹ Price" value={itemPrice} onChange={e => setItemPrice(e.target.value)} type="number" />
          <input style={{...styles.input, width: 50}} placeholder="Qty" value={itemQty} onChange={e => setItemQty(e.target.value)} type="number" />
          <button style={styles.addBtn} onClick={addItem} disabled={loading}>+</button>
        </div>
      </div>

      {/* Items with Assignment */}
      <div className="glass-panel animate-slide-up animate-delay-3" style={{...styles.card, padding: 0}}>
        <div style={{ padding: '24px 24px 0' }}>
          <p style={{...styles.cardTitle, marginBottom: 8}}>Items — tap to assign ({items.length})</p>
          <p style={{...styles.assignHint, marginBottom: 0}}>Tap an item then tap who ate it</p>
        </div>
        {items.length === 0 ? (
          <p style={styles.empty}>No items yet</p>
        ) : (
          items.map(item => (
            <div key={item.id}>
              <div
                style={{
                  ...styles.itemRow,
                  background: selectedItem === item.id ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                  borderRadius: 0, cursor: 'pointer', padding: '16px 24px'
                }}
                onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
              >
                <div>
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemQty}> x{item.quantity}</span>
                  {getItemSplit(item.id).length > 0 && (
                    <span style={styles.assignedBadge}>
                      {getItemSplit(item.id).length} person{getItemSplit(item.id).length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={styles.itemPrice}>₹{item.price}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} style={styles.deleteBtn}>Remove</button>
                </div>
              </div>

              {/* Member assignment panel */}
              {selectedItem === item.id && (
                <div style={styles.assignPanel}>
                  <p style={styles.assignTitle}>Split</p>
                  <div style={styles.memberChips}>
                    {members.map(member => (
                      <button
                        key={member.id}
                        style={{
                          ...styles.chip,
                          background: isAssigned(item.id, member.id) ? 'var(--primary)' : '#fff',
                          color: isAssigned(item.id, member.id) ? '#fff' : 'var(--text-main)',
                        }}
                        onClick={() => toggleAssignment(item.id, member.id)}
                      >
                        {member.name}
                        {isAssigned(item.id, member.id) && (
                          <span> ({isAssigned(item.id, member.id).percentage}%)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {items.length > 0 && (
          <div style={styles.subtotalRow}>
            <span style={styles.itemName}>Subtotal</span>
            <span style={{...styles.itemPrice, color: '#4ec9b0'}}>₹{bill.subtotal}</span>
          </div>
        )}
      </div>

      {/* Split Summary */}
      {members.length > 0 && Object.keys(assignments).length > 0 && (
        <div className="glass-panel animate-slide-up animate-delay-3" style={styles.card}>
          <p style={styles.cardTitle}>Split Summary</p>
          {members.map(member => (
            <div key={member.id} style={styles.memberRow}>
              <div style={styles.avatar}>{member.name[0]}</div>
              <div style={{ flex: 1 }}>
                <p style={styles.memberName}>{member.name}</p>
                <p style={styles.memberOwes}>Owes ₹{calculateMemberTotal(member.id)}</p>
              </div>
            </div>
          ))}
          <button style={styles.saveBtn} onClick={saveSplits}>
            Review and Confirm
          </button>
        </div>
      )}

      {/* Add Member */}
      <div className="glass-panel animate-slide-up animate-delay-3" style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{...styles.cardTitle, marginBottom: 0}}>Add Member</p>
          {'contacts' in navigator && (
            <button style={styles.contactBtnSmall} onClick={addFromContacts}>
              Contacts
            </button>
          )}
        </div>
        <div style={styles.row}>
          <input style={{...styles.input, flex: 1}} placeholder="Phone number" value={memberPhone} onChange={e => setMemberPhone(e.target.value)} type="number" />
          <button style={styles.addBtn} onClick={addMember}>+</button>
        </div>
      </div>

      {/* Members List */}
      <div className="glass-panel animate-slide-up animate-delay-3" style={styles.card}>
        <p style={styles.cardTitle}>Members ({members.length})</p>
        {members.map(member => (
          <div key={member.id} style={styles.memberRow}>
            <div style={styles.avatar}>{member.name[0]}</div>
            <div style={{ flex: 1 }}>
              <p style={styles.memberName}>{member.name}</p>
              <p style={styles.memberOwes}>Owes ₹{member.amount_owed}</p>
            </div>
            <span style={{
              ...styles.statusBadge,
              background: member.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: member.status === 'paid' ? '#065F46' : '#991B1B'
            }}>{member.status}</span>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: 24, maxWidth: 640, margin: '0 auto' },
  back: { background: 'transparent', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 24, paddingTop: 24, display: 'block', fontWeight: '600' },
  billHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  billTitle: { color: 'var(--text-main)', fontSize: 28, fontWeight: '800', margin: 0, letterSpacing: '-0.5px' },
  totalBadge: { background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '8px 16px', borderRadius: 12, fontWeight: '800', fontSize: 20, border: '1px solid rgba(99, 102, 241, 0.1)' },
  deleteBillBtn: { background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: '700' },
  roomCard: { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 24, padding: 32, marginBottom: 24, textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' },
  roomLabel: { color: 'var(--text-muted)', fontSize: 14, margin: '0 0 8px', fontWeight: '600' },
  roomCode: { color: 'var(--primary)', fontSize: 48, fontWeight: '800', letterSpacing: 12, margin: '0 0 24px' },
  shareBtn: { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 28px', cursor: 'pointer', fontWeight: '800', fontSize: 16, width: '100%', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' },
  card: { background: 'var(--surface)', borderRadius: 24, padding: 24, marginBottom: 24, border: '1px solid var(--surface-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  cardTitle: { color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  assignHint: { color: 'var(--text-muted)', fontSize: 12, marginBottom: 16, fontWeight: '500' },
  row: { display: 'flex', gap: 12, alignItems: 'center' },
  input: { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, color: 'var(--text-main)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box', minWidth: 0 },
  addBtn: { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 20, fontWeight: '800', cursor: 'pointer' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', transition: 'all 0.2s' },
  subtotalRow: { display: 'flex', justifyContent: 'space-between', padding: '20px 24px 24px', marginTop: 0 },
  itemName: { color: 'var(--text-main)', fontSize: 16, fontWeight: '700' },
  itemQty: { color: 'var(--text-muted)', fontSize: 14, fontWeight: '500' },
  itemPrice: { color: 'var(--text-main)', fontSize: 16, fontWeight: '800' },
  assignedBadge: { background: 'rgba(99, 102, 241, 0.08)', color: 'var(--primary)', fontSize: 12, padding: '4px 10px', borderRadius: 99, marginLeft: 12, fontWeight: '700' },
  deleteBtn: { background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14 },
  assignPanel: { background: '#F8FAFC', borderRadius: 16, padding: 20, margin: '12px 0' },
  assignTitle: { color: 'var(--text-muted)', fontSize: 13, marginBottom: 12, fontWeight: '700' },
  memberChips: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: { border: '1px solid #E2E8F0', borderRadius: 20, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: '700', transition: 'all 0.2s' },
  empty: { color: 'var(--text-muted)', fontSize: 15, padding: 24, textAlign: 'center', fontWeight: '500' },
  memberRow: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid #F1F5F9' },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: 18, flexShrink: 0 },
  memberName: { color: 'var(--text-main)', fontSize: 16, margin: 0, fontWeight: '700' },
  memberOwes: { color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0', fontWeight: '500' },
  statusBadge: { padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  saveBtn: { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 20, padding: 20, fontSize: 16, fontWeight: '800', cursor: 'pointer', width: '100%', marginTop: 24, boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' },
  uploadBtn: { background: '#F8FAFC', border: '2px dashed #E2E8F0', borderRadius: 20, padding: 32, color: 'var(--primary)', cursor: 'pointer', textAlign: 'center', display: 'block', fontSize: 16, fontWeight: '700', transition: 'all 0.3s' },
  uploadHint: { color: 'var(--text-muted)', fontSize: 13, marginTop: 12, textAlign: 'center', fontWeight: '500' },
  settleBtn: { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 16, padding: '12px 24px', cursor: 'pointer', fontWeight: '800', marginTop: 16 },
  settledBadge: { background: 'rgba(16, 185, 129, 0.1)', color: '#065F46', padding: '12px 24px', borderRadius: 16, fontWeight: '800', marginTop: 16, display: 'inline-block', border: '1px solid rgba(16, 185, 129, 0.2)' },
  contactBtnSmall: { background: 'rgba(99, 102, 241, 0.05)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.1)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: '700' }
};