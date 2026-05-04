import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.name} 👋</Text>
          <Text style={styles.sub}>Ready to split some bills?</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.newBillBtn}
        onPress={() => navigation.navigate('NewBill')}
      >
        <Text style={styles.newBillIcon}>+</Text>
        <Text style={styles.newBillText}>New Bill</Text>
        <Text style={styles.newBillSub}>Scan or create a new bill</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Bills</Text>
        {loading ? (
          <ActivityIndicator color="#4ec9b0" style={{ marginTop: 40 }} />
        ) : bills.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyText}>No bills yet</Text>
            <Text style={styles.emptySub}>Create your first bill above</Text>
          </View>
        ) : (
          bills.map(bill => (
            <TouchableOpacity
              key={bill.id}
              style={styles.billCard}
              onPress={() => navigation.navigate('BillDetail', { billId: bill.id })}
            >
              <View>
                <Text style={styles.billTitle}>{bill.title}</Text>
                <Text style={styles.billMeta}>₹{bill.total} • {bill.status}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 48, marginBottom: 32
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 14, color: '#666', marginTop: 4 },
  logoutBtn: {
    backgroundColor: '#1a1a1a', padding: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#333'
  },
  logoutText: { color: '#aaa', fontSize: 13 },
  newBillBtn: {
    backgroundColor: '#4ec9b0', borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 32
  },
  newBillIcon: { fontSize: 36, color: '#000', fontWeight: 'bold' },
  newBillText: { fontSize: 20, fontWeight: 'bold', color: '#000', marginTop: 8 },
  newBillSub: { fontSize: 13, color: '#065041', marginTop: 4 },
  section: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, color: '#aaa', marginTop: 16, fontWeight: '500' },
  emptySub: { fontSize: 13, color: '#555', marginTop: 8 },
  billCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: '#222'
  },
  billTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  billMeta: { color: '#666', fontSize: 13, marginTop: 4 },
  arrow: { color: '#4ec9b0', fontSize: 18 }
});