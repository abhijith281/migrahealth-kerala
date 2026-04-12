import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getImmunizations, getUpcomingImmunizations } from '../utils/immunizationApi';
import ImmunizationCard from '../components/ImmunizationCard';
import AddImmunizationForm from '../components/AddImmunizationForm';

const Immunizations = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchImmunizations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [historyRes, upcomingRes] = await Promise.all([
        getImmunizations(),
        getUpcomingImmunizations()
      ]);
      setHistory(historyRes.data.data);
      setUpcoming(upcomingRes.data.data);
      
      // Auto-switch tab if no upcoming
      if (upcomingRes.data.data.length === 0) {
        setActiveTab('history');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load immunizations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImmunizations();
  }, [fetchImmunizations]);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    fetchImmunizations();
  };

  const currentList = activeTab === 'upcoming' ? upcoming : history;

  const pageTitle = user?.role === 'patient' ? 'My Immunizations' : 'Patient Immunizations';

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
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
        {/* Header */}
        <div className="page-header">
          <div>
            <Link to="/dashboard" className="breadcrumb-link">← Dashboard</Link>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          {user?.role === 'doctor' && (
            <button
              className="btn btn-primary"
              style={{ width: 'auto' }}
              onClick={() => setShowAddForm(true)}
            >
              + Record Immunization
            </button>
          )}
        </div>

        {/* Upcoming Alert Banner */}
        {!loading && upcoming.length > 0 && (
          <div className="imm-alert-banner">
            <span className="imm-alert-icon">⚠️</span>
            <div>
              <strong>Action Required:</strong> You have {upcoming.length} upcoming or overdue immunization(s).
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert-error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="imm-tabs">
          <button 
            className={`imm-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming / Overdue ({upcoming.length})
          </button>
          <button 
            className={`imm-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History ({history.length})
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="records-loading">
            <div className="spinner"></div>
            <span>Loading immunizations...</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="records-empty">
            <div className="records-empty-icon">💉</div>
            <h3>No records found</h3>
            <p>
              {activeTab === 'upcoming' 
                ? 'No upcoming or overdue immunizations in the next 30 days.'
                : 'No immunization history found.'}
            </p>
          </div>
        ) : (
          <div className="imm-list">
            {currentList.map(imm => (
              <ImmunizationCard key={imm._id} immunization={imm} />
            ))}
          </div>
        )}

      </main>

      {/* Add Form Modal */}
      {showAddForm && (
        <AddImmunizationForm 
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

export default Immunizations;
