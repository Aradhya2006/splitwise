import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function BillDetail() {
  const { billId } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => { fetchBill(); }, []);

  const fetchBill = async () => {
    try {
      const res = await api.get(`/api/bills/${billId}`);
      setBill(res.data.bill);
      setItems(res.data.items);
      setMembers(res.data.members);
      setRoomCode(res.data.room_code);
    } catch (err) { console.error(err); }
  };

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
  const text = `Join my Split.ai bill "${bill?.title}"!\nRoom code: ${roomCode}`;
  if (navigator.share) {
    navigator.share({ title: 'Split.ai', text });
  } else {
    navigator.clipboard.writeText(text);
    alert('Room code copied!');
  }
};

const settleBill = async () => {
  try {
    await api.post(`/api/payments/${billId}/generate`);
    navigate(`/payment/${billId}`);
  } catch (err) {
    alert(err.response?.data?.error || 'Please add your UPI ID first');
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
  } catch (err) {
    alert('Failed to save splits');
  }
};

  if (!bill) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      Loading...
    </div>
  );

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={() => navigate('/home')}>← Back</button>

      <div style={styles.billHeader}>
        <h1 style={styles.billTitle}>{bill.title}</h1>
        <div style={styles.totalBadge}>₹{bill.total}</div>
      </div>

      {/* Room Code */}
      <div style={styles.roomCard}>
  <p style={styles.roomLabel}>Room Code</p>
  <p style={styles.roomCode}>{roomCode}</p>
  <button style={styles.shareBtn} onClick={shareRoomCode}>Share with friends →</button>
  {bill.status !== 'settled' && (
    <button style={styles.settleBtn} onClick={settleBill}>
      Generate Payment Links →
    </button>
  )}
  {bill.status === 'settled' && (
    <div style={styles.settledBadge}>✓ Bill Settled</div>
  )}
</div>

      {/* Scan Bill */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>Scan Bill Photo</p>
        <label style={styles.uploadBtn}>
          {scanning ? 'Scanning...' : '📷 Upload Bill Photo'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={scanBill} disabled={scanning} />
        </label>
        <p style={styles.uploadHint}>AI will automatically extract items and prices</p>
      </div>

      {/* Add Item */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>Add Item Manually</p>
        <div style={styles.row}>
          <input style={{...styles.input, flex: 2}} placeholder="Item name" value={itemName} onChange={e => setItemName(e.target.value)} />
          <input style={{...styles.input, flex: 1}} placeholder="₹ Price" value={itemPrice} onChange={e => setItemPrice(e.target.value)} type="number" />
          <input style={{...styles.input, width: 50}} placeholder="Qty" value={itemQty} onChange={e => setItemQty(e.target.value)} type="number" />
          <button style={styles.addBtn} onClick={addItem} disabled={loading}>+</button>
        </div>
      </div>

      {/* Items with Assignment */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>Items — tap to assign ({items.length})</p>
        <p style={styles.assignHint}>Tap an item then tap who ate it</p>
        {items.length === 0 ? (
          <p style={styles.empty}>No items yet</p>
        ) : (
          items.map(item => (
            <div key={item.id}>
              <div
                style={{
                  ...styles.itemRow,
                  background: selectedItem === item.id ? '#1a2a3a' : 'transparent',
                  borderRadius: 8, cursor: 'pointer', padding: '10px 8px'
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
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} style={styles.deleteBtn}>✕</button>
                </div>
              </div>

              {/* Member assignment panel */}
              {selectedItem === item.id && (
                <div style={styles.assignPanel}>
                  <p style={styles.assignTitle}>Who ate this?</p>
                  <div style={styles.memberChips}>
                    {members.map(member => (
                      <button
                        key={member.id}
                        style={{
                          ...styles.chip,
                          background: isAssigned(item.id, member.id) ? '#4ec9b0' : '#2a2a2a',
                          color: isAssigned(item.id, member.id) ? '#000' : '#fff',
                        }}
                        onClick={() => toggleAssignment(item.id, member.id)}
                      >
                        {member.name}
                        {isAssigned(item.id, member.id) && (
                          <span> ✓ {isAssigned(item.id, member.id).percentage}%</span>
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
        <div style={styles.card}>
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
            Save Splits & Proceed to Payment →
          </button>
        </div>
      )}

      {/* Add Member */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>Add Member</p>
        <div style={styles.row}>
          <input style={{...styles.input, flex: 1}} placeholder="Phone number" value={memberPhone} onChange={e => setMemberPhone(e.target.value)} type="number" />
          <button style={styles.addBtn} onClick={addMember}>+</button>
        </div>
      </div>

      {/* Members List */}
      <div style={styles.card}>
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
              background: member.status === 'paid' ? '#1a3a2a' : '#2a1a1a',
              color: member.status === 'paid' ? '#4ec9b0' : '#f44747'
            }}>{member.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0a0a0a', padding: 24, maxWidth: 600, margin: '0 auto' },
  back: { background: 'transparent', color: '#4ec9b0', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 24, paddingTop: 24, display: 'block' },
  billHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  billTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', margin: 0 },
  totalBadge: { background: '#1a3a2a', color: '#4ec9b0', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', fontSize: 18 },
  roomCard: { background: '#1a1a2a', border: '1px solid #333', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' },
  roomLabel: { color: '#666', fontSize: 13, margin: '0 0 8px' },
  roomCode: { color: '#4ec9b0', fontSize: 36, fontWeight: 'bold', letterSpacing: 8, margin: '0 0 12px' },
  shareBtn: { background: '#4ec9b0', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' },
  card: { background: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { color: '#aaa', fontSize: 13, marginBottom: 12 },
  assignHint: { color: '#555', fontSize: 12, marginBottom: 12 },
  row: { display: 'flex', gap: 8, alignItems: 'center' },
  input: { background: '#2a2a2a', border: '1px solid #333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, outline: 'none' },
  addBtn: { background: '#4ec9b0', color: '#000', border: 'none', borderRadius: 10, padding: '12px 16px', fontSize: 20, fontWeight: 'bold', cursor: 'pointer' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222' },
  subtotalRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 8px 0', marginTop: 4 },
  itemName: { color: '#fff', fontSize: 15 },
  itemQty: { color: '#666', fontSize: 13 },
  itemPrice: { color: '#aaa', fontSize: 15, fontWeight: '500' },
  assignedBadge: { background: '#1a3a2a', color: '#4ec9b0', fontSize: 11, padding: '2px 6px', borderRadius: 4, marginLeft: 8 },
  deleteBtn: { background: '#2a1a1a', color: '#f44747', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 },
  assignPanel: { background: '#111', borderRadius: 8, padding: 12, margin: '4px 0 8px' },
  assignTitle: { color: '#aaa', fontSize: 12, marginBottom: 8 },
  memberChips: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: { border: 'none', borderRadius: 20, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: '500' },
  empty: { color: '#555', fontSize: 14 },
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #222' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#4ec9b0', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16, flexShrink: 0 },
  memberName: { color: '#fff', fontSize: 15, margin: 0 },
  memberOwes: { color: '#666', fontSize: 13, margin: '2px 0 0' },
  statusBadge: { padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: '500' },
  saveBtn: { background: '#4ec9b0', color: '#000', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: 16 },
  uploadBtn: { background: '#1a2a3a', border: '1px dashed #4ec9b0', borderRadius: 10, padding: 16, color: '#4ec9b0', cursor: 'pointer', textAlign: 'center', display: 'block', fontSize: 15, fontWeight: '500' },
  uploadHint: { color: '#555', fontSize: 12, marginTop: 8, textAlign: 'center' },
  settleBtn: {
  background: '#4ec9b0', color: '#000', border: 'none',
  borderRadius: 8, padding: '10px 20px', cursor: 'pointer',
  fontWeight: 'bold', marginTop: 8
},
settledBadge: {
  background: '#1a3a2a', color: '#4ec9b0', padding: '8px 16px',
  borderRadius: 8, fontWeight: 'bold', marginTop: 8,
  display: 'inline-block'
}
};