import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyPatients } from '../utils/patientApi';

const LANGUAGE_LABELS = {
  ml: 'Malayalam', hi: 'Hindi', bn: 'Bengali',
  ta: 'Tamil', or: 'Odia', en: 'English',
};

const MyPatients = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await getMyPatients();
        setPatients(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load patients.');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  return (
    <div className="dashboard-layout">
      <nav className="navbar">
        <Link to="/dashboard" className="navbar-brand">
          <div className="icon">🏥</div>
          <span>MigraHealth Kerala</span>
        </Link>
        <div className="navbar-right">
          <span className={`role-badge ${user?.role}`}>{user?.role}</span>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <Link to="/dashboard" className="breadcrumb-link">← Dashboard</Link>
            <h1 className="page-title">My Patients</h1>
          </div>
          <span className="count-badge">{patients.length} patient{patients.length !== 1 ? 's' : ''}</span>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="records-loading">
            <div className="spinner"></div>
            <span>Loading patients...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="records-empty">
            <div className="records-empty-icon">👥</div>
            <h3>No patients assigned yet</h3>
            <p>Patients will appear here once they are assigned to you by an admin.</p>
          </div>
        ) : (
          <div className="patients-grid">
            {patients.map((profile) => (
              <div key={profile._id} className="patient-card">
                <div className="patient-avatar">
                  {profile.user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="patient-info">
                  <h3 className="patient-name">{profile.user?.name}</h3>
                  <p className="patient-meta">📱 {profile.user?.phone}</p>
                  {profile.user?.language && (
                    <p className="patient-meta">
                      🌐 {LANGUAGE_LABELS[profile.user.language] || profile.user.language}
                    </p>
                  )}
                  {profile.user?.homeState && (
                    <p className="patient-meta">🏠 {profile.user.homeState}</p>
                  )}
                  {profile.bloodGroup && profile.bloodGroup !== 'Unknown' && (
                    <span className="blood-badge">🩸 {profile.bloodGroup}</span>
                  )}
                  {profile.chronicConditions?.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {profile.chronicConditions.map((c) => (
                        <span key={c} className="tag tag-warning" style={{ fontSize: '0.7rem' }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  to="/health-records"
                  className="patient-view-btn"
                  title="View Records"
                >
                  📋 Records
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPatients;
