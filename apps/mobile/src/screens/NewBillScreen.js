import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import api from '../services/api';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 24 },
  back: { marginTop: 60, marginBottom: 24 },
  backText: { color: '#6366F1', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 36, fontWeight: '800', color: '#0F172A', letterSpacing: -1 },
  sub: { fontSize: 15, color: '#64748B', marginTop: 8, marginBottom: 40, fontWeight: '500' },
  form: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  label: { color: '#64748B', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  input: {
    backgroundColor: '#F8FAFC', color: '#0F172A', borderRadius: 16,
    padding: 18, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0'
  },
  btn: {
    backgroundColor: '#6366F1', borderRadius: 20,
    padding: 18, alignItems: 'center', marginTop: 32,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }
});

export default function NewBillScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const createBill = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a bill title');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/bills', { title });
      navigation.navigate('BillDetail', { billId: res.data.bill.id });
    } catch (err) {
      Alert.alert('Error', 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.back}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>New Bill</Text>
      <Text style={styles.sub}>Create a bill and invite friends to split.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Bill Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dinner at Pizza Hut"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
        />

        <TouchableOpacity
          style={styles.btn}
          onPress={createBill}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create Bill</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}