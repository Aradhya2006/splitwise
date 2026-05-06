import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();

  useEffect(() => {
    // Redirect to Home if already logged in and not in the middle of onboarding
    if (user && step === 'phone') {
      navigation.replace('Home');
    }
  }, [user, step, navigation]);

  const sendOTP = async () => {
    if (phone.length !== 10) return Alert.alert('Error', 'Enter a valid 10-digit number');
    setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { phone });
      setStep('otp');
    } catch { Alert.alert('Error', 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) return Alert.alert('Error', 'Enter 6-digit OTP');
    setLoading(true);
    const result = await login(phone, otp, name);
    if (result.success) setStep('upi');
    else Alert.alert('Error', result.error);
    setLoading(false);
  };

  const saveUpiId = async () => {
    setLoading(true);
    try {
      if (upiId.trim()) await api.post('/api/payments/upi-id', { upiId });
    } catch (err) { console.error(err); }
    finally { 
      setLoading(false); 
      navigation.replace('Home');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.header}>
        <Text style={styles.logo}>Split.ai</Text>
        <Text style={styles.tagline}>Split bills, not friendships.</Text>
      </View>

      <View style={styles.form}>
        {step === 'phone' && (
          <>
            <Text style={styles.label}>Your Name</Text>
            <TextInput style={styles.input} placeholder="Enter your name" value={name} onChangeText={setName} />
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="10-digit number" keyboardType="numeric" maxLength={10} value={phone} onChangeText={setPhone} />
            </View>
            <TouchableOpacity style={styles.btn} onPress={sendOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.label}>OTP sent to +91 {phone}</Text>
            <TextInput style={[styles.input, styles.otpInput]} placeholder="123456" keyboardType="numeric" maxLength={6} value={otp} onChangeText={setOtp} />
            <TouchableOpacity style={styles.btn} onPress={verifyOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify and Login</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}><Text style={styles.back}>Change number</Text></TouchableOpacity>
          </>
        )}

        {step === 'upi' && (
          <>
            <Text style={styles.upiTitle}>One last step!</Text>
            <Text style={styles.upiSub}>Add your UPI ID so friends can pay you back</Text>
            <Text style={styles.label}>Your UPI ID</Text>
            <TextInput style={styles.input} placeholder="e.g. name@okaxis" value={upiId} onChangeText={setUpiId} autoCapitalize="none" />
            <TouchableOpacity style={styles.btn} onPress={saveUpiId} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save and Continue</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={saveUpiId}><Text style={styles.back}>Skip for now</Text></TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 60 },
  logo: { fontSize: 48, fontWeight: '800', color: '#6366F1', letterSpacing: -1.5 },
  tagline: { fontSize: 16, color: '#64748B', marginTop: 8, fontWeight: '500' },
  form: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  label: { color: '#64748B', fontSize: 13, marginBottom: 8, marginTop: 20, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#F8FAFC', color: '#0F172A', borderRadius: 16, padding: 18, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countryCode: { color: '#0F172A', fontSize: 16, fontWeight: '700', backgroundColor: '#F8FAFC', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  otpInput: { fontSize: 28, textAlign: 'center', letterSpacing: 10, fontWeight: '800' },
  btn: { backgroundColor: '#6366F1', borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 32, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  back: { color: '#6366F1', textAlign: 'center', marginTop: 24, fontWeight: '700', fontSize: 15 },
  upiTitle: { color: '#0F172A', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  upiSub: { color: '#64748B', fontSize: 15, textAlign: 'center', marginBottom: 16, fontWeight: '500' }
});