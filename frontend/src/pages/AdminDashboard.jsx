import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats,
  getRecordsAnalytics,
  getAdminUsers,
  changeUserRole,
  deleteUser,
  getAdminPatients,
  assignDoctorToPatient,
  getAdminDoctors
} from '../utils/adminApi';
import StatsCard from '../components/StatsCard';
import MiniBarChart from '../components/MiniBarChart';
import AdminUserRow from '../components/AdminUserRow';
import AdminPatientRow from '../components/AdminPatientRow';

const TABS = ['Overview', 'Users', 'Patients', 'Doctors'];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Overview states
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState([]);

  // Users states
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Patients & Doctors states
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');

  // Fetch logic based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'Overview') {
        const [statsRes, chartRes] = await Promise.all([
          getAdminStats(),
          getRecordsAnalytics()
        ]);
        setStats(statsRes.data.data);
        setChartData(chartRes.data.data);
      } 
      else if (activeTab === 'Users') {
        const usersRes = await getAdminUsers(); // Fetch all initially, filter client-side 
        setUsers(usersRes.data.data);
      }
      else if (activeTab === 'Patients') {
        const [patientsRes, doctorsRes] = await Promise.all([
          getAdminPatients(),
          getAdminDoctors()
        ]);
        setPatients(patientsRes.data.data);
        setDoctors(doctorsRes.data.data);
      }
      else if (activeTab === 'Doctors') {
        const doctorsRes = await getAdminDoctors();
        setDoctors(doctorsRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load panel data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // User Actions
  const handleRoleChange = async (userId, newRole) => {
    try {
      await changeUserRole(userId, newRole);
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to change role: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      alert('Failed to delete user: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const filteredUsers = users.filter(u => {
    const term = userSearch.toLowerCase();
    const matchSearch = u.name?.toLowerCase().includes(term) || u.phone?.includes(term);
    const matchRole = roleFilter ? u.role === roleFilter : true;
    return matchSearch && matchRole;
  });

  // Patient Actions
  const handleAssignDoctor = async (patientProfileId, doctorId) => {
    try {
      const res = await assignDoctorToPatient(patientProfileId, doctorId);
      // Refresh current patients to reflect deep assignment state (optional but safer)
      const patientsRes = await getAdminPatients();
      setPatients(patientsRes.data.data);
    } catch (err) {
      alert('Failed to assign doctor: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const filteredPatients = patients.filter(p => {
    if (!p.user) return false;
    const term = patientSearch.toLowerCase();
    return p.user.name?.toLowerCase().includes(term) || p.user.phone?.includes(term);
  });

  const unassignedPatientsCount = patients.filter(p => !p.assignedDoctor).length;

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <nav className="navbar">
        <Link to="/admin" className="navbar-brand">
          <div className="icon">🛡️</div>
          <span>MigraHealth Admin</span>
        </Link>
        <div className="navbar-right">
          <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </nav>

      <main className="dashboard-main" style={{ paddingBottom: '4rem' }}>
        <div className="admin-header">
          <h1>System Control Panel</h1>
          <p>Supervise users, patients, and health resources.</p>
        </div>

        <div className="admin-tabs">
          {TABS.map(tab => (
            <button 
              key={tab} 
              className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div className="flex-center" style={{ margin: '4rem 0' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="admin-content">

            {/* OVERVIEW PANEL */}
            {activeTab === 'Overview' && (
              <>
                <div className="stats-row">
                  <StatsCard icon="👥" title="Total Users" value={stats.totalUsers || 0} color="default" />
                  <StatsCard icon="🤒" title="Patients" value={stats.totalPatients || 0} color="primary" />
                  <StatsCard icon="⚕️" title="Doctors" value={stats.totalDoctors || 0} color="success" />
                  <StatsCard icon="📋" title="Health Records" value={stats.totalRecords || 0} color="warning" />
                  <StatsCard icon="📅" title="Appointments" value={stats.totalAppointments || 0} color="info" />
                  <StatsCard icon="💉" title="Immunizations" value={stats.totalImmunizations || 0} color="secondary" />
                  {stats.pendingAppointments > 0 && (
                    <StatsCard icon="⏳" title="Pending Appts" value={stats.pendingAppointments} color="danger" />
                  )}
                </div>

                <div className="chart-section">
                  <h3>Records Over Time</h3>
                  <MiniBarChart data={chartData} />
                </div>
              </>
            )}


            {/* USERS PANEL */}
            {activeTab === 'Users' && (
              <div className="dr-section">
                <div className="dr-section-head">
                  <input 
                    type="text" 
                    className="dr-search-input" 
                    placeholder="Search by name or phone..." 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <select 
                    className="admin-role-filter"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="patient">Patients</option>
                    <option value="doctor">Doctors</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>

                <div className="admin-list">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(u => (
                      <AdminUserRow 
                        key={u._id} 
                        user={u} 
                        currentUserId={user._id}
                        onRoleChange={handleRoleChange}
                        onDelete={handleDeleteUser}
                      />
                    ))
                  ) : <p className="empty-msg">No users match your criteria.</p>}
                </div>
              </div>
            )}


            {/* PATIENTS PANEL */}
            {activeTab === 'Patients' && (
              <div className="dr-section">
                <div className="dr-section-head" style={{ flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    className="dr-search-input" 
                    placeholder="Search patients..." 
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  {unassignedPatientsCount > 0 && (
                    <span className="badge badge-warning" style={{ alignSelf: 'center' }}>
                      {unassignedPatientsCount} Unassigned Patients
                    </span>
                  )}
                </div>

                <div className="admin-list">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map(p => (
                      <AdminPatientRow 
                        key={p._id} 
                        profile={p}
                        doctors={doctors}
                        onAssignDoctor={handleAssignDoctor}
                      />
                    ))
                  ) : <p className="empty-msg">No patients match your criteria.</p>}
                </div>
              </div>
            )}


            {/* DOCTORS PANEL */}
            {activeTab === 'Doctors' && (
              <div className="admin-grid">
                {doctors.length > 0 ? (
                  doctors.map(d => (
                    <div key={d._id} className="admin-doctor-card">
                      <h3>Dr. {d.user?.name}</h3>
                      <p className="spec">{d.specialization || 'General Physician'}</p>
                      {d.hospital && <p className="hosp">🏠 {d.hospital.name} ({d.hospital.district})</p>}
                      <div className="dr-pat-count">
                        <span className="badge badge-primary">{d.patientCount} Assigned Patients</span>
                      </div>
                      
                      {d.patients && d.patients.length > 0 && (
                        <div className="dr-pat-chips">
                          {d.patients.map(pat => (
                            <span key={pat._id} className="chip">{pat.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : <p className="empty-msg">No doctors found.</p>}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
