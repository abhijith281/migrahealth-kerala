import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const LANGUAGE_LABELS = {
  ml: 'Malayalam', hi: 'Hindi', bn: 'Bengali',
  ta: 'Tamil', or: 'Odia', en: 'English',
};

// Role-based navigation config
const NAV_CONFIG = {
  patient: [
    { to: '/health-records', icon: '📋', label: 'My Health Records', desc: 'View and add your health records' },
    { to: '/appointments', icon: '📅', label: 'My Appointments', desc: 'Book and manage appointments' },
    { to: '/immunizations', icon: '💉', label: 'Immunizations', desc: 'Track your vaccination history' },
    { to: '/profile', icon: '👤', label: 'My Profile', desc: 'Update your health profile' },
  ],
  doctor: [
    { to: '/health-records', icon: '📋', label: 'Patient Records', desc: 'View records of your patients' },
    { to: '/appointments', icon: '📅', label: 'My Schedule', desc: 'View and manage your schedule' },
    { to: '/immunizations', icon: '💉', label: 'Immunizations', desc: 'Record patient vaccinations' },
    { to: '/my-patients', icon: '👥', label: 'My Patients', desc: 'Manage your assigned patients' },
  ],
  admin: [
    { to: '/health-records', icon: '📋', label: 'All Records', desc: 'View and manage all health records' },
    { to: '/appointments', icon: '📅', label: 'All Appointments', desc: 'View all appointment activity' },
    { to: '/immunizations', icon: '💉', label: 'Immunizations', desc: 'View all vaccination records' },
    { to: '/users', icon: '👤', label: 'User Management', desc: 'Manage users and roles' },
  ],
};

const ROLE_STATS = {
  patient: [
    { icon: '📋', label: 'Health Records', value: '—' },
    { icon: '💊', label: 'Prescriptions', value: '—' },
    { icon: '🏥', label: 'Visits', value: '—' },
    { icon: '💉', label: 'Vaccinations', value: '—' },
  ],
  doctor: [
    { icon: '👥', label: 'My Patients', value: '—' },
    { icon: '📝', label: 'Prescriptions', value: '—' },
    { icon: '📅', label: 'Appointments', value: '—' },
    { icon: '⚕️', label: 'Consultations', value: '—' },
  ],
  admin: [
    { icon: '👤', label: 'Total Users', value: '—' },
    { icon: '🏥', label: 'Hospitals', value: '—' },
    { icon: '📊', label: 'Records', value: '—' },
    { icon: '🔔', label: 'Alerts', value: '—' },
  ],
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = NAV_CONFIG[user?.role] || [];
  const stats = ROLE_STATS[user?.role] || ROLE_STATS.patient;

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <nav className="navbar">
        <Link to="/dashboard" className="navbar-brand">
          <div className="icon">🏥</div>
          <span>MigraHealth Kerala</span>
        </Link>
        <div className="navbar-right">
          <LanguageSwitcher compact={true} />
          <span className={`role-badge ${user?.role}`}>{user?.role}</span>
          <button id="logout-btn" className="btn-logout" onClick={handleLogout}>
            {t('logout')}
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <h1>
            {t('welcome')}, <span>{user?.name}</span> 👋
          </h1>
          <p>
            Phone: {user?.phone} &nbsp;·&nbsp;
            Language: {LANGUAGE_LABELS[user?.language] || user?.language}
            {user?.homeState && <> &nbsp;·&nbsp; Home State: {user.homeState}</>}
          </p>
        </div>

        {/* Role-Based Quick Nav */}
        <div className="section-header">
          <h2 className="section-title">Quick Access</h2>
        </div>
        <div className="nav-cards">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="nav-card">
              <div className="nav-card-icon">{link.icon}</div>
              <div className="nav-card-body">
                <strong>{link.label}</strong>
                <span>{link.desc}</span>
              </div>
              <span className="nav-card-arrow">→</span>
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="section-header" style={{ marginTop: '2rem' }}>
          <h2 className="section-title">Overview</h2>
        </div>
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
