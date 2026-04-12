import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDoctorStats, getDoctorPatients } from '../utils/doctorApi';
import StatsCard from '../components/StatsCard';
import PatientListItem from '../components/PatientListItem';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, patientsRes] = await Promise.all([
          getDoctorStats(),
          getDoctorPatients()
        ]);
        setStats(statsRes.data.data);
        setPatients(patientsRes.data.data);
      } catch (err) {
        console.error('Failed to load doctor dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    const name = (p.user?.name || '').toLowerCase();
    const phone = (p.user?.phone || '').toLowerCase();
    const state = (p.user?.homeState || '').toLowerCase();
    return name.includes(term) || phone.includes(term) || state.includes(term);
  });

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <nav className="navbar">
        <Link to="/doctor" className="navbar-brand">
          <div className="icon">⚕️</div>
          <span>MigraHealth Doctor</span>
        </Link>
        <div className="navbar-right">
          <span className="role-badge doctor">Doctor Portal</span>
          <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="welcome-banner">
          <h1>Welcome, Dr. {user?.name}</h1>
          <p>Here is your practice overview for today.</p>
        </div>

        {loading ? (
          <div className="records-loading">
            <div className="spinner"></div>
            <span>Loading portal...</span>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="stats-row">
              <StatsCard icon="👥" title="Total Patients" value={stats?.totalPatients || 0} color="default" />
              <StatsCard icon="📅" title="Today's Appts" value={stats?.todayAppointments || 0} color="primary" />
              <StatsCard icon="⏳" title="Pending Appts" value={stats?.pendingAppointments || 0} color="warning" />
              <StatsCard icon="💉" title="Upcoming Vax" value={stats?.upcomingVaccines || 0} color="info" />
            </div>

            {/* Patients List Section */}
            <div className="dr-section">
              <div className="dr-section-head">
                <h2>My Patients</h2>
                <input 
                  type="text" 
                  className="dr-search-input" 
                  placeholder="Search by name, phone, or state..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="dr-patient-list">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map(p => (
                    <PatientListItem key={p.user._id} patientData={p} />
                  ))
                ) : (
                  <p className="empty-msg">No patients found matching your search.</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
