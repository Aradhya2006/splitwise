import React, { useState } from 'react';
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
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const sendOTP = async () => {
    if (phone.length !== 10) {
      Alert.alert('Error', 'Enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { phone });
      setStep('otp');
      Alert.alert('OTP Sent', 'Use 123456 for testing');
    } catch (err) {
      Alert.alert('Error', 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    const result = await login(phone, otp, name);
    if (!result.success) {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.header}>
        <Text style={styles.logo}>Split.ai</Text>
        <Text style={styles.tagline}>Split bills. Not friendships.</Text>
      </View>

      <View style={styles.form}>
        {step === 'phone' ? (
          <>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="10-digit mobile number"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <TouchableOpacity
              style={styles.btn}
              onPress={sendOTP}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Send OTP →</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP sent to +91 {phone}</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
            <Text style={styles.hint}>Use 123456 for testing</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={verifyOTP}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Verify & Login →</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.back}>← Change number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 48
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#4ec9b0',
    letterSpacing: 2
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginTop: 8
  },
  form: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333'
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  countryCode: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: '#2a2a2a',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333'
  },
  otpInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8
  },
  btn: {
    backgroundColor: '#4ec9b0',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 24
  },
  btnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold'
  },
  hint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8
  },
  back: {
    color: '#4ec9b0',
    textAlign: 'center',
    marginTop: 16
  }
});