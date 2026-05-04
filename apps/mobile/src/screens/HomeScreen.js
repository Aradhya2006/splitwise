import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, Alert,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [bills, setBills] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiInput, setUpiInput] = useState('');
  const [filterType, setFilterType] = useState('pending');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await api.get('/api/bills');
      setBills(res.data.bills || []);
      setDashboardStats(res.data.dashboardStats || {});
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const saveUpiId = async () => {
    if (!upiInput.trim()) return;
    try {
      await api.post('/api/payments/upi-id', { upiId: upiInput.trim() });
      await updateUser({ upi_id: upiInput.trim() });
      setShowUpiModal(false);
      Alert.alert('Success', 'UPI ID saved!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update UPI ID');
    }
  };

  const joinBill = async () => {
    if (!roomCode.trim()) return;
    try {
      const res = await api.post('/api/bills/join', { roomCode: roomCode.trim().toUpperCase() });
      setShowJoinModal(false);
      setRoomCode('');
      fetchBills(); // Refresh the list
      navigation.navigate('BillDetail', { billId: res.data.billId });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to join bill');
    }
  };

  const filteredBills = bills.filter(b => {
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, {user?.name}</Text>
          {user?.upi_id ? (
            <TouchableOpacity onPress={() => { setUpiInput(user.upi_id); setShowUpiModal(true); }}>
              <Text style={styles.sub}>UPI ID: <Text style={{color: '#6366F1'}}>{user.upi_id}</Text></Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setUpiInput(''); setShowUpiModal(true); }}>
              <Text style={styles.sub}>Add UPI ID</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.dashboardCard}
        onPress={() => setFilterType('pending')}
      >
        <Text style={styles.dashboardLabel}>Amount Pending to Settle</Text>
        <Text style={styles.dashboardAmount}>₹{dashboardStats.totalPending || '0.00'}</Text>
      </TouchableOpacity>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('NewBill')}
        >
          <Text style={styles.actionBtnText}>New Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.joinBtn]}
          onPress={() => setShowJoinModal(true)}
        >
          <Text style={[styles.actionBtnText, { color: '#6366F1' }]}>Join Bill</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Your Bills</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabBtn, filterType === 'draft' && styles.tabActive]}
              onPress={() => setFilterType('draft')}
            >
              <Text style={[styles.tabText, filterType === 'draft' && styles.tabTextActive]}>Drafts</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, filterType === 'pending' && styles.tabActive]}
              onPress={() => setFilterType('pending')}
            >
              <Text style={[styles.tabText, filterType === 'pending' && styles.tabTextActive]}>Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, filterType === 'settled' && styles.tabActive]}
              onPress={() => setFilterType('settled')}
            >
              <Text style={[styles.tabText, filterType === 'settled' && styles.tabTextActive]}>Settled</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
        ) : filteredBills.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No {filterType} bills</Text>
            <Text style={styles.emptySub}>Create your first bill to get started.</Text>
          </View>
        ) : (
          filteredBills.map(bill => (
            <TouchableOpacity
              key={bill.id}
              style={styles.billCard}
              onPress={() => navigation.navigate('BillDetail', { billId: bill.id })}
            >
              <View>
                <Text style={styles.billTitle}>{bill.title}</Text>
                <Text style={styles.billMeta}>₹{bill.total} • {bill.status}</Text>
              </View>
              <View style={styles.arrowBadge}><Text style={styles.arrowText}>Open</Text></View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <Modal visible={showUpiModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set UPI ID</Text>
            <Text style={styles.modalSub}>Others will use this to pay you back</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. yourname@okaxis"
              placeholderTextColor="#94A3B8"
              value={upiInput}
              onChangeText={setUpiInput}
              autoCapitalize="none"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUpiModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveUpiId}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showJoinModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Bill</Text>
            <Text style={styles.modalSub}>Enter the 6-letter room code to join</Text>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
              placeholder="AB3X9Y"
              placeholderTextColor="#94A3B8"
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowJoinModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={joinBill}>
                <Text style={styles.saveBtnText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 60, marginBottom: 32
  },
  greeting: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  sub: { fontSize: 14, color: '#64748B', marginTop: 6, fontWeight: '500' },
  dashboardCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32,
    alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  dashboardLabel: { color: '#64748B', fontSize: 15, marginBottom: 12, fontWeight: '600' },
  dashboardAmount: { color: '#6366F1', fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.1)'
  },
  logoutText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  actionBtn: {
    flex: 1, backgroundColor: '#6366F1', borderRadius: 16,
    padding: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
  },
  joinBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  section: { flex: 1, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#0F172A' },
  emptyState: { alignItems: 'center', marginTop: 80, opacity: 0.8 },
  emptyText: { fontSize: 18, color: '#0F172A', fontWeight: '700' },
  emptySub: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '500' },
  billCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1
  },
  billTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  billMeta: { color: '#64748B', fontSize: 14, marginTop: 6, fontWeight: '600' },
  arrowBadge: { backgroundColor: 'rgba(99, 102, 241, 0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  arrowText: { color: '#6366F1', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 10 },
  modalTitle: { color: '#0F172A', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  modalSub: { color: '#64748B', fontSize: 15, marginTop: 8, marginBottom: 24, fontWeight: '500' },
  input: { backgroundColor: '#F8FAFC', color: '#0F172A', borderRadius: 16, padding: 18, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 32 },
  cancelBtn: { flex: 1, padding: 18, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16 },
  cancelBtnText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 18, alignItems: 'center', backgroundColor: '#6366F1', borderRadius: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});