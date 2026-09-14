import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/admin/Dashboard';

// A simple protected route wrapper
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Dummy Dashboards
const GarageDashboard = () => <div className="p-8"><h1>Garage Dashboard</h1></div>;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route path="/admin-dashboard" element={
        <ProtectedRoute>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/garage-dashboard" element={
        <ProtectedRoute>
          <GarageDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
