import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { NotificationToast } from './components/common/NotificationToast';

// Auth pages
import { SignIn } from './pages/auth/SignIn';
import { SignUp } from './pages/auth/SignUp';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Patient Portal pages
import { Dashboard } from './pages/patient/Dashboard';
import { MedicalRecords } from './pages/patient/MedicalRecords';
import { Reminders } from './pages/patient/Reminders';
import { SharingStudio } from './pages/patient/SharingStudio';
import { SupportDesk } from './pages/patient/SupportDesk';
import { ProfileSettings } from './pages/patient/ProfileSettings';

// Doctor Sharing Portal pages
import { DoctorPortalAuth } from './pages/doctor/DoctorPortalAuth';
import { DoctorRecordsViewer } from './pages/doctor/DoctorRecordsViewer';

// Common
import { NotFound } from './pages/NotFound';

// Protected Route Guard
const ProtectedPatientLayout: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-health-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <NotificationToast />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Doctor Limited-Access Portal Routes */}
        <Route path="/doctor/portal" element={<DoctorPortalAuth />} />
        <Route path="/doctor/viewer" element={<DoctorRecordsViewer />} />

        {/* Protected Patient Workspace */}
        <Route element={<ProtectedPatientLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/records" element={<MedicalRecords />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/sharing" element={<SharingStudio />} />
          <Route path="/support" element={<SupportDesk />} />
          <Route path="/profile" element={<ProfileSettings />} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <NotificationToast />
    </>
  );
};

export default App;
