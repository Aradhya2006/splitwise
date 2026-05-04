import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking, Alert, ActivityIndicator, Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function PaymentScreen({ route, navigation }) {
  const { user } = useAuth();
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
    } catch (err) { Alert.alert('Error', 'Failed to generate payments'); }
    setLoading(false);
  };

  const openUPI = (upiLink) => {
    Linking.openURL(upiLink).catch(() => Alert.alert('Error', 'No UPI app found'));
  };

  const confirmPayment = async (memberId) => {
    setConfirming(memberId);
    try {
      await api.post(`/api/payments/${billId}/confirm/${memberId}`);
      fetchPayments();
    } catch { Alert.alert('Error', 'Failed to confirm'); }
    setConfirming(null);
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator color="#6366F1" size="large" /></View>;

  const displayPayments = user?.id === payer?.id ? payments : payments.filter(p => p.userId === user?.id);

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>Back</Text></TouchableOpacity>

      <Text style={styles.title}>Payment</Text>
      <Text style={styles.sub}>
        {user?.id === payer?.id ? 'Everyone pays you' : 'You pay'} <Text style={styles.highlight}>{payer?.name}</Text> on <Text style={styles.highlight}>{payer?.upi_id}</Text>
      </Text>

      {displayPayments.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyText}>All settled</Text></View>
      ) : (
        displayPayments.map(payment => (
          <View key={payment.userId} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{payment.name[0]}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.memberName}>{payment.name}</Text><Text style={styles.memberPhone}>{payment.phone}</Text></View>
              <View style={styles.amountBadge}><Text style={styles.amountText}>₹{payment.amount}</Text></View>
            </View>

            {payment.qrCode && (
              <View style={styles.qrContainer}><Image source={{ uri: payment.qrCode }} style={styles.qrCode} /><Text style={styles.qrHint}>Scan to pay via any UPI app</Text></View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.upiBtn} onPress={() => openUPI(payment.upiLink)}><Text style={styles.upiBtnText}>Pay via UPI</Text></TouchableOpacity>
              {user?.id === payer?.id && (
                <TouchableOpacity style={[styles.confirmBtn, payment.status === 'paid' && styles.paidBtn]} onPress={() => confirmPayment(payment.userId)} disabled={payment.status === 'paid'}>
                  <Text style={[styles.confirmBtnText, payment.status === 'paid' && styles.paidBtnText]}>{confirming === payment.userId ? '...' : payment.status === 'paid' ? 'Paid' : 'Mark Paid'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Home')}><Text style={styles.doneBtnText}>Return to Home</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  loading: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  back: { marginTop: 60, marginBottom: 16 },
  backText: { color: '#6366F1', fontSize: 16, fontWeight: '700' },
  title: { color: '#0F172A', fontSize: 36, fontWeight: '800', marginBottom: 8, letterSpacing: -1 },
  sub: { color: '#64748B', fontSize: 15, marginBottom: 32, fontWeight: '500' },
  highlight: { color: '#6366F1', fontWeight: '700' },
  paymentCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  memberName: { color: '#0F172A', fontSize: 18, fontWeight: '700' },
  memberPhone: { color: '#64748B', fontSize: 14, marginTop: 2 },
  amountBadge: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
  amountText: { color: '#6366F1', fontWeight: '800', fontSize: 20 },
  qrContainer: { alignItems: 'center', marginBottom: 24, padding: 24, backgroundColor: '#F8FAFC', borderRadius: 20 },
  qrCode: { width: 220, height: 220, borderRadius: 16, borderWidth: 4, borderColor: '#6366F1', backgroundColor: '#fff' },
  qrHint: { color: '#64748B', fontSize: 13, marginTop: 16 },
  btnRow: { flexDirection: 'row', gap: 12 },
  upiBtn: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 16, padding: 18, alignItems: 'center' },
  upiBtnText: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: '#6366F1', borderRadius: 16, padding: 18, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  paidBtn: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  paidBtnText: { color: '#6366F1' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#0F172A', fontSize: 28, fontWeight: '800', marginTop: 24 },
  doneBtn: { backgroundColor: '#6366F1', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 12, marginBottom: 60, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
