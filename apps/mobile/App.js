import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import NewBillScreen from './src/screens/NewBillScreen';
import BillDetailScreen from './src/screens/BillDetailScreen';
import PaymentScreen from './src/screens/PaymentScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator color="#4ec9b0" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* We allow navigating to Login manually so the UPI step can complete */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="NewBill" component={NewBillScreen} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}