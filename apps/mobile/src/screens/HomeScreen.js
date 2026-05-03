import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.name} 👋</Text>
          <Text style={styles.sub}>Ready to split some bills?</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.newBillBtn} onPress={() => navigation.navigate('NewBill')}>
        <Text style={styles.newBillIcon}>+</Text>
        <Text style={styles.newBillText}>New Bill</Text>
        <Text style={styles.newBillSub}>Scan or create a new bill</Text>
      </TouchableOpacity>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Bills</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyText}>No bills yet</Text>
          <Text style={styles.emptySub}>Create your first bill above</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
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
  emptySub: { fontSize: 13, color: '#555', marginTop: 8 }
});