import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRecords, deleteRecord } from '../utils/patientApi';
import HealthRecordForm from '../components/HealthRecordForm';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import TranslateButton from '../components/TranslateButton';

const RECORD_TYPE_META = {
  consultation:    { label: 'Consultation',    icon: '🩺', color: '#06b6d4' },
  prescription:    { label: 'Prescription',    icon: '💊', color: '#10b981' },
  lab_result:      { label: 'Lab Result',      icon: '🔬', color: '#a855f7' },
  immunization:    { label: 'Immunization',    icon: '💉', color: '#f59e0b' },
  hospitalization: { label: 'Hospitalization', icon: '🏥', color: '#ef4444' },
  self_report:     { label: 'Self Report',     icon: '📝', color: '#64748b' },
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const HealthRecords = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRecords();
      setRecords(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchRecords(); // Refresh list after adding
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete record.');
    } finally {
      setDeleteId(null);
      setDeleting(false);
    }
  };

  const pageTitle =
    user?.role === 'patient'
      ? t('healthRecords')
      : user?.role === 'doctor'
      ? t('healthRecords')
      : t('healthRecords');

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
        {/* Page Header */}
        <div className="page-header">
          <div>
            <Link to="/dashboard" className="breadcrumb-link">← {t('dashboard')}</Link>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          {/* Patients (and doctors for their patients) can add records */}
          {(user?.role === 'patient' || user?.role === 'doctor') && (
            <button
              id="add-record-btn"
              className="btn btn-primary"
              style={{ width: 'auto' }}
              onClick={() => setShowForm(true)}
            >
              + {t('addRecord')}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="alert-error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="records-loading">
            <div className="spinner"></div>
            <span>{t('loading')}</span>
          </div>
        ) : records.length === 0 ? (
          <div className="records-empty">
            <div className="records-empty-icon">📋</div>
            <h3>{t('noRecords')}</h3>
            <p>
              {user?.role === 'patient'
                ? 'Add your first self-report to start building your health history.'
                : 'No records found for your assigned patients.'}
            </p>
            {user?.role === 'patient' && (
              <button className="btn btn-primary" style={{ width: 'auto', marginTop: '1rem' }}
                onClick={() => setShowForm(true)}>
                + Add First Record
              </button>
            )}
          </div>
        ) : (
          <div className="records-list">
            {records.map((record) => {
              const meta = RECORD_TYPE_META[record.recordType] || RECORD_TYPE_META.self_report;
              return (
                <div key={record._id} className="record-card">
                  {/* Type badge */}
                  <div className="record-card-left">
                    <div
                      className="record-type-icon"
                      style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}44` }}
                    >
                      {meta.icon}
                    </div>
                  </div>

                  {/* Main info */}
                  <div className="record-card-body">
                    <div className="record-card-top">
                      <span className="record-type-label" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      {record.isVerified ? (
                        <span className="badge badge-verified">✓ Verified</span>
                      ) : (
                        <span className="badge badge-unverified">⏳ Unverified</span>
                      )}
                    </div>

                    <h3 className="record-title">{record.title}</h3>

                    {record.diagnosis && (
                      <div className="record-diagnosis">
                        <strong>{t('diagnosis')}:</strong> 
                        <span id={`diag-text-${record._id}`} style={{marginLeft:'4px'}}>{record._displayDiagnosis || record.diagnosis}</span>
                        <TranslateButton 
                          originalText={record.diagnosis} 
                          onTranslated={(text) => {
                            setRecords(records.map(r => r._id === record._id ? { ...r, _displayDiagnosis: text } : r));
                          }} 
                        />
                      </div>
                    )}

                    {record.description && (
                      <div className="record-description" style={{display:'flex', alignItems:'center'}}>
                        <span>{record._displayDescription || record.description}</span>
                        <TranslateButton 
                          originalText={record.description} 
                          onTranslated={(text) => {
                            setRecords(records.map(r => r._id === record._id ? { ...r, _displayDescription: text } : r));
                          }} 
                        />
                      </div>
                    )}

                    {record.medications?.length > 0 && (
                      <div className="record-meds">
                        <strong>{t('medications')}:</strong>{' '}
                        {record.medications.map((m, i) => (
                          <span key={i} className="med-tag">
                            {m.name}{m.dosage ? ` (${m.dosage})` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="record-card-footer">
                      <span className="record-meta">📅 {formatDate(record.visitDate)}</span>
                      {record.facility?.name && (
                        <span className="record-meta">🏥 {record.facility.name}</span>
                      )}
                      {record.patient?.name && user?.role !== 'patient' && (
                        <span className="record-meta">👤 {record.patient.name}</span>
                      )}
                      {record.doctor?.name && (
                        <span className="record-meta">⚕️ Dr. {record.doctor.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {user?.role === 'admin' && (
                    <div className="record-card-actions">
                      {deleteId === record._id ? (
                        <div className="confirm-delete">
                          <span>Sure?</span>
                          <button
                            className="btn-danger-sm"
                            onClick={() => handleDelete(record._id)}
                            disabled={deleting}
                          >
                            {deleting ? '...' : 'Yes'}
                          </button>
                          <button className="btn-ghost-sm" onClick={() => setDeleteId(null)}>
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-danger-sm"
                          onClick={() => setDeleteId(record._id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Record Modal */}
      {showForm && (
        <HealthRecordForm
          userRole={user?.role}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
          patientId={user?.role !== 'patient' ? undefined : undefined}
        />
      )}
    </div>
  );
};

export default HealthRecords;
