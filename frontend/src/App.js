// Root App — React Router + Auth-based routing
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LoginPage from './pages/auth/LoginPage';
import MainAdminDashboard from './pages/dashboard/MainAdminDashboard';
import CollegeAdminDashboard from './pages/dashboard/CollegeAdminDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import ExamPage from './pages/exam/ExamPage';
import ExamResultPage from './pages/exam/ExamResultPage';
import CreateExamPage from './pages/exam/CreateExamPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import ManageCollegesPage from './pages/admin/ManageCollegesPage';
import ExamMonitorPage from './pages/admin/ExamMonitorPage';
import ExamResultsPage from './pages/admin/ExamResultsPage';
import ProfilePage from './pages/auth/ProfilePage';

// Role-based route guard
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

// Redirect to role-based dashboard
const DashboardRedirect = () => {
  const { user } = useAuth();
  const dashboards = {
    main_admin: '/admin/dashboard',
    college_admin: '/college/dashboard',
    staff: '/staff/dashboard',
    student: '/student/dashboard',
  };
  return <Navigate to={dashboards[user?.role] || '/login'} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

      {/* Main Admin */}
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={['main_admin']}><MainAdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/colleges" element={<ProtectedRoute roles={['main_admin']}><ManageCollegesPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['main_admin','college_admin','staff']}><ManageUsersPage /></ProtectedRoute>} />
      <Route path="/admin/monitor/:examId" element={<ProtectedRoute roles={['main_admin','college_admin','staff']}><ExamMonitorPage /></ProtectedRoute>} />
      <Route path="/admin/exams/:examId/results" element={<ProtectedRoute roles={['main_admin','college_admin','staff']}><ExamResultsPage /></ProtectedRoute>} />

      {/* College Admin */}
      <Route path="/college/dashboard" element={<ProtectedRoute roles={['college_admin']}><CollegeAdminDashboard /></ProtectedRoute>} />

      {/* Staff */}
      <Route path="/staff/dashboard" element={<ProtectedRoute roles={['staff']}><StaffDashboard /></ProtectedRoute>} />
      <Route path="/staff/exams/create" element={<ProtectedRoute roles={['main_admin','college_admin','staff']}><CreateExamPage /></ProtectedRoute>} />

      {/* Student */}
      <Route path="/student/dashboard" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/exam/:examId" element={<ProtectedRoute roles={['student']}><ErrorBoundary><ExamPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/exam/result/:sessionId" element={<ProtectedRoute roles={['student']}><ExamResultPage /></ProtectedRoute>} />

      {/* Profile — all authenticated roles */}
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
