import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import BillDetail from './pages/BillDetail';
import Payment from './pages/Payment';

// inside Routes add:


function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ background: '#050505', minHeight: '100vh' }} />;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/payment/:billId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
      <Route path="/bill/:billId" element={<ProtectedRoute><BillDetail /></ProtectedRoute>} />
      <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}



