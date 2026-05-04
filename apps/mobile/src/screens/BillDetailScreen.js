import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Share, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function BillDetailScreen({ route, navigation }) {
  const { user } = useAuth();
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
  const [scanning, setScanning] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contactList, setContactList] = useState([]);
  const [contactSearch, setContactSearch] = useState('');

  useEffect(() => { fetchBill(); }, []);

  const fetchBill = async () => {
    try {
      const res = await api.get(`/api/bills/${billId}`);
      setBill(res.data.bill);
      setItems(res.data.items);
      setMembers(res.data.members);
      setRoomCode(res.data.room_code);

      const splitsRes = await api.get(`/api/splits/${billId}/items`);
      if (splitsRes.data.splits) {
        const loadedAssignments = {};
        splitsRes.data.splits.forEach(split => {
          if (!loadedAssignments[split.item_id]) loadedAssignments[split.item_id] = [];
          loadedAssignments[split.item_id].push({ memberId: split.user_id, percentage: parseFloat(split.percentage) });
        });
        setAssignments(loadedAssignments);
      }
    } catch (err) { console.error(err); }
  };

  const addItem = async () => {
    if (!itemName || !itemPrice) return;
    setLoading(true);
    try {
      await api.post(`/api/bills/${billId}/items`, { name: itemName, price: parseFloat(itemPrice), quantity: 1 });
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
    } catch (err) { Alert.alert('Error', err.response?.data?.error || 'User not found'); }
  };

  const shareRoomCode = async () => {
    try {
      await Share.share({ message: `Join my Split.ai bill "${bill?.title}"!\nRoom code: ${roomCode}` });
    } catch (error) { Alert.alert('Error', error.message); }
  };

  const scanBill = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed');

    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
    if (!result.canceled) {
      setScanning(true);
      try {
        const formData = new FormData();
        formData.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'bill.jpg' });
        const res = await fetch('http://localhost:8000/parse-bill', { method: 'POST', body: formData });
        const data = await res.json();
        for (const item of data.items) {
          await api.post(`/api/bills/${billId}/items`, { name: item.name, price: item.price, quantity: item.quantity || 1 });
        }
        fetchBill();
        Alert.alert('Success', `Scanned items!`);
      } catch (err) { Alert.alert('Error', 'Failed to scan bill'); }
      setScanning(false);
    }
  };

  const loadContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers], sort: Contacts.SortTypes.FirstName });
      if (data.length > 0) {
        setContactList(data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0));
        setShowContacts(true);
      }
    }
  };

  const handleContactSelect = async (contact) => {
    setShowContacts(false);
    setContactSearch('');
    const rawPhone = contact.phoneNumbers[0].number.replace(/\D/g, '');
    if (rawPhone.length >= 10) {
      const phone = rawPhone.slice(-10);
      try {
        await api.post(`/api/bills/${billId}/members`, { phone });
        fetchBill();
      } catch (err) { Alert.alert('Error', 'User not found'); }
    }
  };

  const toggleAssignment = (itemId, memberId) => {
    setAssignments(prev => {
      const current = prev[itemId] || [];
      const exists = current.find(a => a.memberId === memberId);
      let updated;
      if (exists) {
        updated = current.filter(a => a.memberId !== memberId);
      } else {
        updated = [...current, { memberId }];
      }
      const pct = updated.length > 0 ? Math.floor(100 / updated.length) : 0;
      const remainder = updated.length > 0 ? 100 - (pct * updated.length) : 0;
      return { ...prev, [itemId]: updated.map((a, i) => ({ ...a, percentage: i === 0 ? pct + remainder : pct })) };
    });
  };

  const isAssigned = (itemId, memberId) => (assignments[itemId] || []).find(a => a.memberId === memberId);

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
        assignments: (assignments[item.id] || []).map(a => ({ userId: a.memberId, percentage: a.percentage }))
      })).filter(s => s.assignments.length > 0);

      await api.post(`/api/splits/${billId}/calculate`, {
        splits,
        tax: { cgst: parseFloat(bill.cgst), sgst: parseFloat(bill.sgst), serviceCharge: parseFloat(bill.service_charge) },
        discount: { type: bill.discount_type || 'none', amount: parseFloat(bill.discount_amount) }
      });
      navigation.navigate('Payment', { billId });
    } catch { Alert.alert('Error', 'Failed to save splits'); }
  };

  const deleteBill = () => {
    Alert.alert('Delete Bill', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/api/bills/${billId}`); navigation.navigate('Home'); }
        catch (err) { Alert.alert('Error', 'Failed to delete'); }
      }}
    ]);
  };

  if (!bill) return <View style={styles.loading}><ActivityIndicator color="#6366F1" size="large" /></View>;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>Back to Bills</Text></TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{bill.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.totalBadge}><Text style={styles.totalText}>₹{bill.total}</Text></View>
          {user?.id === bill.created_by && (
            <TouchableOpacity style={styles.deleteBillBtn} onPress={deleteBill}><Text style={styles.deleteBillBtnText}>Delete Bill</Text></TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.roomCard}>
        <Text style={styles.roomLabel}>Room Code</Text>
        <Text style={styles.roomCode}>{roomCode}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={shareRoomCode}><Text style={styles.shareBtnText}>Copy Invite Link</Text></TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Item</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 2 }]} placeholder="Item name" value={itemName} onChangeText={setItemName} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="₹ Price" value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" />
          <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={loading}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.uploadBtn} onPress={scanBill} disabled={scanning}>
          <Text style={styles.uploadBtnText}>{scanning ? 'Scanning...' : 'Upload Bill Image'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items — tap to assign</Text>
        {items.map(item => (
          <View key={item.id}>
            <TouchableOpacity style={[styles.itemRow, selectedItem === item.id && styles.itemRowSelected]} onPress={() => setSelectedItem(selectedItem === item.id ? null : item.id)}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.itemRight}>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
                <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}><Text style={styles.deleteBtnText}>Remove</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
            {selectedItem === item.id && (
              <View style={styles.assignPanel}>
                <Text style={styles.assignTitle}>Split</Text>
                <View style={styles.chips}>
                  {members.map(member => (
                    <TouchableOpacity key={member.id} style={[styles.chip, isAssigned(item.id, member.id) && styles.chipActive]} onPress={() => toggleAssignment(item.id, member.id)}>
                      <Text style={[styles.chipText, isAssigned(item.id, member.id) && styles.chipTextActive]}>
                        {member.name} {isAssigned(item.id, member.id) ? `(Selected)` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Add Member</Text>
          <TouchableOpacity style={styles.contactBtnSmall} onPress={loadContacts}><Text style={styles.contactBtnTextSmall}>Contacts</Text></TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Phone number" value={memberPhone} onChangeText={setMemberPhone} keyboardType="numeric" />
          <TouchableOpacity style={styles.addBtn} onPress={addMember}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
        </View>
      </View>

      {members.length > 0 && Object.keys(assignments).length > 0 && (
        <View style={[styles.card, { marginBottom: 100 }]}>
          <Text style={styles.cardTitle}>Split Summary</Text>
          {members.map(member => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{member.name[0]}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.memberOwes}>Owes ₹{calculateMemberTotal(member.id)}</Text></View>
            </View>
          ))}
          <TouchableOpacity style={styles.saveBtn} onPress={saveSplits}><Text style={styles.saveBtnText}>Review and Confirm</Text></TouchableOpacity>
        </View>
      )}

      <Modal visible={showContacts} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Select Contact</Text><TouchableOpacity onPress={() => setShowContacts(false)}><Text style={styles.modalClose}>Close</Text></TouchableOpacity></View>
            <TextInput style={styles.searchInput} placeholder="Search..." value={contactSearch} onChangeText={setContactSearch} />
            <FlatList data={contactList.filter(c => (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()))} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactItem} onPress={() => handleContactSelect(item)}><Text style={styles.contactName}>{item.name}</Text><Text style={styles.contactPhone}>{item.phoneNumbers[0].number}</Text></TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  loading: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  back: { marginTop: 60, marginBottom: 16 },
  backText: { color: '#6366F1', fontSize: 16, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { color: '#0F172A', fontSize: 28, fontWeight: '800', flex: 1, letterSpacing: -0.5 },
  totalBadge: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
  totalText: { color: '#6366F1', fontWeight: '800', fontSize: 18 },
  deleteBillBtn: { backgroundColor: 'rgba(239, 68, 68, 0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.1)' },
  deleteBillBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  roomCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  roomLabel: { color: '#64748B', fontSize: 14, marginBottom: 8, fontWeight: '600' },
  roomCode: { color: '#6366F1', fontSize: 40, fontWeight: '800', letterSpacing: 10, marginBottom: 24 },
  shareBtn: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, width: '100%', alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  uploadBtn: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 12 },
  uploadBtnText: { color: '#6366F1', fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  cardTitle: { color: '#64748B', fontSize: 13, marginBottom: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: { backgroundColor: '#F8FAFC', color: '#0F172A', borderRadius: 16, padding: 16, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', flex: 1 },
  addBtn: { backgroundColor: '#6366F1', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', width: 56, height: 56 },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  itemRowSelected: { backgroundColor: 'rgba(99, 102, 241, 0.05)', borderRadius: 16, paddingHorizontal: 12, borderBottomWidth: 0 },
  itemName: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemPrice: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 10, padding: 8 },
  deleteBtnText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold' },
  assignPanel: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginVertical: 12 },
  assignTitle: { color: '#64748B', fontSize: 14, marginBottom: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  chipText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '800' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  memberName: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  memberOwes: { color: '#64748B', fontSize: 14, marginTop: 4, fontWeight: '500' },
  saveBtn: { backgroundColor: '#6366F1', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 12, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  contactBtnSmall: { backgroundColor: 'rgba(99, 102, 241, 0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.1)' },
  contactBtnTextSmall: { color: '#6366F1', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  modalTitle: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  modalClose: { color: '#6366F1', fontSize: 16, fontWeight: '700' },
  contactItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  contactName: { color: '#0F172A', fontSize: 17, fontWeight: '700' },
  contactPhone: { color: '#64748B', fontSize: 14, marginTop: 6 },
  searchInput: { backgroundColor: '#F8FAFC', color: '#0F172A', borderRadius: 16, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }
});