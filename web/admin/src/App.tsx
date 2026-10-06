import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/admin/Dashboard';
import UsersPage from './pages/admin/UsersPage';
import ServicesPage from './pages/admin/ServicesPage';
import Garages from './pages/admin/Garages';
import TechniciansPage from './pages/admin/TechniciansPage';

// A simple protected route wrapper
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Route wrapper for public pages (Login) to redirect authenticated users to Dashboard
const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    const role = user?.role?.toUpperCase();
    if (role === 'GARAGE_OWNER') {
      return <Navigate to="/garage-dashboard" replace />;
    }
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <>{children}</>;
};

// Placeholder view for pages not yet coded
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8">
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center py-16">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <p className="text-gray-400 mt-2">Trang đang trong quá trình phát triển.</p>
    </div>
  </div>
);

const GarageDashboard = () => <div className="p-8"><h1>Garage Dashboard</h1></div>;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Navigate to="/login" replace /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      
      {/* Protected Routes */}
      <Route path="/admin-dashboard" element={
        <ProtectedRoute>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/garages" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Garages />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/technicians" element={
        <ProtectedRoute>
          <DashboardLayout>
            <TechniciansPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/finance" element={
        <ProtectedRoute>
          <DashboardLayout>
            <PlaceholderPage title="Quản lý Tài chính" />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/services" element={
        <ProtectedRoute>
          <DashboardLayout>
            <ServicesPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute>
          <DashboardLayout>
            <PlaceholderPage title="Báo cáo & Thống kê" />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/complaints" element={
        <ProtectedRoute>
          <DashboardLayout>
            <PlaceholderPage title="Quản lý Khiếu nại" />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute>
          <DashboardLayout>
            <UsersPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute>
          <DashboardLayout>
            <PlaceholderPage title="Cài đặt hệ thống" />
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