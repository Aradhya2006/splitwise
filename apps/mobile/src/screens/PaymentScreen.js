import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking, Alert, ActivityIndicator, Image
} from 'react-native';
import api from '../services/api';

export default function PaymentScreen({ route, navigation }) {
  const { billId } = route.params;
  const [payments, setPayments] = useState([]);
  const [payer, setPayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const res = await api.post(`/api/payments/${billId}/generate`);
      setPayments(res.data.payments);
      setPayer(res.data.payer);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to generate payments');
    }
    setLoading(false);
  };

  const openUPI = (upiLink) => {
    Linking.openURL(upiLink).catch(() => {
      Alert.alert('Error', 'No UPI app found on this device');
    });
  };

  const confirmPayment = async (memberId) => {
    setConfirming(memberId);
    try {
      await api.post(`/api/payments/${billId}/confirm/${memberId}`);
      fetchPayments();
    } catch {
      Alert.alert('Error', 'Failed to confirm payment');
    }
    setConfirming(null);
  };

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator color="#4ec9b0" size="large" />
      <Text style={styles.loadingText}>Generating payment links...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Payment</Text>
      <Text style={styles.sub}>
        Pay <Text style={styles.highlight}>{payer?.name}</Text> on{' '}
        <Text style={styles.highlight}>{payer?.upi_id}</Text>
      </Text>

      {payments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text style={styles.emptyText}>All settled!</Text>
        </View>
      ) : (
        payments.map(payment => (
          <View key={payment.userId} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{payment.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{payment.name}</Text>
                <Text style={styles.memberPhone}>{payment.phone}</Text>
              </View>
              <View style={styles.amountBadge}>
                <Text style={styles.amountText}>₹{payment.amount}</Text>
              </View>
            </View>

            {payment.qrCode && (
              <View style={styles.qrContainer}>
                <Image source={{ uri: payment.qrCode }} style={styles.qrCode} />
                <Text style={styles.qrHint}>Scan to pay via any UPI app</Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.upiBtn}
                onPress={() => openUPI(payment.upiLink)}
              >
                <Text style={styles.upiBtnText}>📱 Pay via UPI</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, payment.status === 'paid' && styles.paidBtn]}
                onPress={() => confirmPayment(payment.userId)}
                disabled={payment.status === 'paid'}
              >
                <Text style={[styles.confirmBtnText, payment.status === 'paid' && styles.paidBtnText]}>
                  {confirming === payment.userId ? '...' : payment.status === 'paid' ? '✓ Paid' : 'Mark Paid'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.doneBtnText}>Done → Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  loading: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#666', marginTop: 12 },
  back: { marginTop: 48, marginBottom: 16 },
  backText: { color: '#4ec9b0', fontSize: 16 },
  title: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  sub: { color: '#666', fontSize: 14, marginBottom: 24 },
  highlight: { color: '#4ec9b0', fontWeight: '500' },
  paymentCard: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 16 },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4ec9b0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  memberName: { color: '#fff', fontSize: 16, fontWeight: '500' },
  memberPhone: { color: '#666', fontSize: 13 },
  amountBadge: { backgroundColor: '#1a3a2a', padding: 8, borderRadius: 8 },
  amountText: { color: '#4ec9b0', fontWeight: 'bold', fontSize: 18 },
  qrContainer: { alignItems: 'center', marginBottom: 16 },
  qrCode: { width: 180, height: 180, borderRadius: 12, borderWidth: 3, borderColor: '#4ec9b0' },
  qrHint: { color: '#666', fontSize: 12, marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 10 },
  upiBtn: { flex: 1, backgroundColor: '#1a2a3a', borderWidth: 1, borderColor: '#4ec9b0', borderRadius: 10, padding: 12, alignItems: 'center' },
  upiBtnText: { color: '#4ec9b0', fontSize: 14, fontWeight: '500' },
  confirmBtn: { flex: 1, backgroundColor: '#4ec9b0', borderRadius: 10, padding: 12, alignItems: 'center' },
  confirmBtnText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  paidBtn: { backgroundColor: '#1a3a2a' },
  paidBtnText: { color: '#4ec9b0' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  doneBtn: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#4ec9b0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  doneBtnText: { color: '#4ec9b0', fontSize: 16 }
});
