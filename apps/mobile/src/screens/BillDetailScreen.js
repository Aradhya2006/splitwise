import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import api from '../services/api';

export default function BillDetailScreen({ route, navigation }) {
  const { billId } = route.params;
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(false);

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
        name: itemName, price: parseFloat(itemPrice), quantity: 1
      });
      setItemName(''); setItemPrice('');
      fetchBill();
    } catch { Alert.alert('Error', 'Failed to add item'); }
    setLoading(false);
  };

  const deleteItem = async (itemId) => {
    try {
      await api.delete(`/api/bills/${billId}/items/${itemId}`);
      fetchBill();
    } catch { Alert.alert('Error', 'Failed to delete item'); }
  };

  const addMember = async () => {
    if (!memberPhone) return;
    try {
      await api.post(`/api/bills/${billId}/members`, { phone: memberPhone });
      setMemberPhone('');
      fetchBill();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'User not found');
    }
  };

  const toggleAssignment = (itemId, memberId) => {
    setAssignments(prev => {
      const current = prev[itemId] || [];
      const exists = current.find(a => a.memberId === memberId);
      if (exists) {
        const updated = current.filter(a => a.memberId !== memberId);
        const pct = updated.length > 0 ? Math.floor(100 / updated.length) : 0;
        const remainder = updated.length > 0 ? 100 - (pct * updated.length) : 0;
        return { ...prev, [itemId]: updated.map((a, i) => ({ ...a, percentage: i === 0 ? pct + remainder : pct })) };
      } else {
        const updated = [...current, { memberId }];
        const pct = Math.floor(100 / updated.length);
        const remainder = 100 - (pct * updated.length);
        return { ...prev, [itemId]: updated.map((a, i) => ({ ...a, percentage: i === 0 ? pct + remainder : pct })) };
      }
    });
  };

  const isAssigned = (itemId, memberId) => {
    return (assignments[itemId] || []).find(a => a.memberId === memberId);
  };

  const calculateMemberTotal = (memberId) => {
    let total = 0;
    items.forEach(item => {
      const assignment = (assignments[item.id] || []).find(a => a.memberId === memberId);
      if (assignment) total += (parseFloat(item.price) * assignment.percentage) / 100;
    });
    return total.toFixed(2);
  };

  const saveSplits = async () => {
    try {
      const splits = items.map(item => ({
        itemId: item.id,
        assignments: (assignments[item.id] || []).map(a => ({
          userId: a.memberId, percentage: a.percentage
        }))
      })).filter(s => s.assignments.length > 0);

      await api.post(`/api/splits/${billId}/calculate`, {
        splits,
        tax: { cgst: parseFloat(bill.cgst), sgst: parseFloat(bill.sgst), serviceCharge: parseFloat(bill.service_charge) },
        discount: { type: bill.discount_type || 'none', amount: parseFloat(bill.discount_amount) }
      });

      navigation.navigate('Payment', { billId });
    } catch { Alert.alert('Error', 'Failed to save splits'); }
  };

  if (!bill) return (
    <View style={styles.loading}>
      <ActivityIndicator color="#4ec9b0" size="large" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{bill.title}</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>₹{bill.total}</Text>
        </View>
      </View>

      {/* Room Code */}
      <View style={styles.roomCard}>
        <Text style={styles.roomLabel}>Room Code</Text>
        <Text style={styles.roomCode}>{roomCode}</Text>
      </View>

      {/* Add Item */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Item</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Item name"
            placeholderTextColor="#666"
            value={itemName}
            onChangeText={setItemName}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="₹ Price"
            placeholderTextColor="#666"
            value={itemPrice}
            onChangeText={setItemPrice}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={loading}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items — tap to assign</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>No items yet</Text>
        ) : (
          items.map(item => (
            <View key={item.id}>
              <TouchableOpacity
                style={[styles.itemRow, selectedItem === item.id && styles.itemRowSelected]}
                onPress={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  <TouchableOpacity
                    onPress={() => deleteItem(item.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {selectedItem === item.id && (
                <View style={styles.assignPanel}>
                  <Text style={styles.assignTitle}>Who ate this?</Text>
                  <View style={styles.chips}>
                    {members.map(member => (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.chip, isAssigned(item.id, member.id) && styles.chipActive]}
                        onPress={() => toggleAssignment(item.id, member.id)}
                      >
                        <Text style={[styles.chipText, isAssigned(item.id, member.id) && styles.chipTextActive]}>
                          {member.name}
                          {isAssigned(item.id, member.id) ? ` ✓ ${isAssigned(item.id, member.id).percentage}%` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))
        )}
        {items.length > 0 && (
          <View style={styles.subtotalRow}>
            <Text style={styles.itemName}>Subtotal</Text>
            <Text style={[styles.itemPrice, { color: '#4ec9b0' }]}>₹{bill.subtotal}</Text>
          </View>
        )}
      </View>

      {/* Split Summary */}
      {members.length > 0 && Object.keys(assignments).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Split Summary</Text>
          {members.map(member => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberOwes}>Owes ₹{calculateMemberTotal(member.id)}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.saveBtn} onPress={saveSplits}>
            <Text style={styles.saveBtnText}>Save Splits & Proceed to Payment →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Member */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Member</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Phone number"
            placeholderTextColor="#666"
            value={memberPhone}
            onChangeText={setMemberPhone}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addMember}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Members */}
      <View style={[styles.card, { marginBottom: 40 }]}>
        <Text style={styles.cardTitle}>Members ({members.length})</Text>
        {members.map(member => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberOwes}>Owes ₹{member.amount_owed}</Text>
            </View>
            <View style={[styles.statusBadge, { background: member.status === 'paid' ? '#1a3a2a' : '#2a1a1a' }]}>
              <Text style={{ color: member.status === 'paid' ? '#4ec9b0' : '#f44747', fontSize: 12 }}>
                {member.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  loading: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  back: { marginTop: 48, marginBottom: 16 },
  backText: { color: '#4ec9b0', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', flex: 1 },
  totalBadge: { backgroundColor: '#1a3a2a', padding: 8, borderRadius: 8 },
  totalText: { color: '#4ec9b0', fontWeight: 'bold', fontSize: 16 },
  roomCard: { backgroundColor: '#1a1a2a', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center' },
  roomLabel: { color: '#666', fontSize: 12, marginBottom: 4 },
  roomCode: { color: '#4ec9b0', fontSize: 28, fontWeight: 'bold', letterSpacing: 6 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { color: '#aaa', fontSize: 12, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#333' },
  addBtn: { backgroundColor: '#4ec9b0', borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  itemRowSelected: { backgroundColor: '#1a2a3a', borderRadius: 8, paddingHorizontal: 8 },
  itemName: { color: '#fff', fontSize: 15 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPrice: { color: '#aaa', fontSize: 15 },
  deleteBtn: { backgroundColor: '#2a1a1a', borderRadius: 6, padding: 4 },
  deleteBtnText: { color: '#f44747', fontSize: 12 },
  assignPanel: { backgroundColor: '#111', borderRadius: 8, padding: 12, marginVertical: 6 },
  assignTitle: { color: '#aaa', fontSize: 12, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#2a2a2a', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#4ec9b0' },
  chipText: { color: '#fff', fontSize: 13 },
  chipTextActive: { color: '#000', fontWeight: '500' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 },
  empty: { color: '#555', fontSize: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4ec9b0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  memberName: { color: '#fff', fontSize: 14 },
  memberOwes: { color: '#666', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  saveBtn: { backgroundColor: '#4ec9b0', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: 'bold' }
});