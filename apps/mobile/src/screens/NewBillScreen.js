import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import api from '../services/api';

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
      const { bill, room_code } = res.data;
      Alert.alert(
        'Bill Created!',
        `Room code: ${room_code}\nShare this with friends to join`,
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
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
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>New Bill</Text>
      <Text style={styles.sub}>Create a bill and invite friends</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Bill Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dinner at Pizza Hut"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />

        <TouchableOpacity
          style={styles.btn}
          onPress={createBill}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.btnText}>Create Bill →</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  back: { marginTop: 48, marginBottom: 24 },
  backText: { color: '#4ec9b0', fontSize: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 14, color: '#666', marginTop: 8, marginBottom: 32 },
  form: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 10,
    padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#333'
  },
  btn: {
    backgroundColor: '#4ec9b0', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 24
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});