import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAppointments } from '../utils/appointmentApi';
import AppointmentCard from '../components/AppointmentCard';
import BookAppointmentForm from '../components/BookAppointmentForm';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const Appointments = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [showBookForm, setShowBookForm] = useState(false);

  const fetchAppointments = useCallback(async (statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAppointments(statusFilter || undefined);
      setAppointments(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchAppointments(activeFilter);
  }, [fetchAppointments, activeFilter]);

  const handleFilterChange = (key) => {
    setActiveFilter(key);
  };

  const handleBookSuccess = () => {
    setShowBookForm(false);
    fetchAppointments(activeFilter);
  };

  const handleCardUpdate = () => {
    fetchAppointments(activeFilter);
  };

  const pageTitle =
    user?.role === 'patient'
      ? t('appointments')
      : user?.role === 'doctor'
      ? t('appointments')
      : t('appointments');

  // Count stats
  const counts = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
  };

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
        </div>
      </nav>

      <main className="dashboard-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <Link to="/dashboard" className="breadcrumb-link">← {t('dashboard')}</Link>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          {user?.role === 'patient' && (
            <button
              id="book-appointment-btn"
              className="btn btn-primary"
              style={{ width: 'auto' }}
              onClick={() => setShowBookForm(true)}
            >
              + {t('bookAppointment')}
            </button>
          )}
        </div>

        {/* Quick stats */}
        <div className="appt-stats-row">
          <div className="appt-stat">
            <span className="appt-stat-value">{counts.total}</span>
            <span className="appt-stat-label">Total</span>
          </div>
          <div className="appt-stat">
            <span className="appt-stat-value" style={{ color: '#f59e0b' }}>{counts.pending}</span>
            <span className="appt-stat-label">Pending</span>
          </div>
          <div className="appt-stat">
            <span className="appt-stat-value" style={{ color: '#06b6d4' }}>{counts.confirmed}</span>
            <span className="appt-stat-label">Confirmed</span>
          </div>
        </div>

        {/* Status filter buttons */}
        <div className="appt-filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`appt-filter-btn ${activeFilter === f.key ? 'active' : ''}`}
              onClick={() => handleFilterChange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="alert-error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Loading / Empty / List */}
        {loading ? (
          <div className="records-loading">
            <div className="spinner"></div>
            <span>{t('loading')}</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="records-empty">
            <div className="records-empty-icon">📅</div>
            <h3>{t('noAppointments')}</h3>
            <p>
              {activeFilter
                ? `No ${activeFilter} appointments. Try a different filter.`
                : user?.role === 'patient'
                ? 'Book your first appointment to get started.'
                : 'No appointments to display.'}
            </p>
            {user?.role === 'patient' && !activeFilter && (
              <button
                className="btn btn-primary"
                style={{ width: 'auto', marginTop: '1rem' }}
                onClick={() => setShowBookForm(true)}
              >
                + {t('bookAppointment')}
              </button>
            )}
          </div>
        ) : (
          <div className="appt-list">
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt._id}
                appointment={appt}
                userRole={user?.role}
                onUpdate={handleCardUpdate}
              />
            ))}
          </div>
        )}
      </main>

      {/* Book Appointment Modal */}
      {showBookForm && (
        <BookAppointmentForm
          onSuccess={handleBookSuccess}
          onCancel={() => setShowBookForm(false)}
        />
      )}
    </div>
  );
};

export default Appointments;
