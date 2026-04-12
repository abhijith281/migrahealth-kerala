import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';

// Core pages
import Dashboard from './pages/Dashboard';

// Phase 2 pages
import HealthRecords from './pages/HealthRecords';
import ProfilePage from './pages/ProfilePage';
import MyPatients from './pages/MyPatients';

// Phase 3 pages
import Appointments from './pages/Appointments';

// Phase 4 pages
import Immunizations from './pages/Immunizations';

// Phase 5 pages
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDetail from './pages/PatientDetail';

// Phase 7 pages
import AdminDashboard from './pages/AdminDashboard';

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Initializing MigraHealth Kerala...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────── */}
      <Route path="/login"    element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'doctor' ? '/doctor' : '/dashboard'} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'doctor' ? '/doctor' : '/dashboard'} replace /> : <Register />} />

      {/* ── Protected: All roles ──────────────────────── */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />

      <Route path="/health-records" element={
        <ProtectedRoute roles={['patient', 'doctor', 'admin']}>
          <HealthRecords />
        </ProtectedRoute>
      } />

      {/* ── Patient only ──────────────────────────────── */}
      <Route path="/profile" element={
        <ProtectedRoute roles={['patient']}>
          <ProfilePage />
        </ProtectedRoute>
      } />

      {/* ── Doctor only ───────────────────────────────── */}
      <Route path="/my-patients" element={
        <ProtectedRoute roles={['doctor']}>
          <MyPatients />
        </ProtectedRoute>
      } />
      
      <Route path="/doctor" element={
        <ProtectedRoute roles={['doctor']}>
          <DoctorDashboard />
        </ProtectedRoute>
      } />

      <Route path="/doctor/patients/:patientId" element={
        <ProtectedRoute roles={['doctor']}>
          <PatientDetail />
        </ProtectedRoute>
      } />

      {/* ── Admin only ───────────────────────────────── */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* ── All roles: Appointments ────────────────────── */}
      <Route path="/appointments" element={
        <ProtectedRoute roles={['patient', 'doctor', 'admin']}>
          <Appointments />
        </ProtectedRoute>
      } />

      {/* ── All roles: Immunizations ───────────────────── */}
      <Route path="/immunizations" element={
        <ProtectedRoute roles={['patient', 'doctor', 'admin']}>
          <Immunizations />
        </ProtectedRoute>
      } />

      {/* ── Misc ─────────────────────────────────────── */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : user.role === 'doctor' ? '/doctor' : '/dashboard') : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
