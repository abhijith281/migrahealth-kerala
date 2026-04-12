import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoctorPatientDetail, createDoctorPatientRecord } from '../utils/doctorApi';
import PatientTabs from '../components/PatientTabs';
// Re-using HealthRecordForm from Phase 2
import HealthRecordForm from '../components/HealthRecordForm'; 

const PatientDetail = () => {
  const { patientId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddRecord, setShowAddRecord] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await getDoctorPatientDetail(patientId);
      setData(res.data.data);
    } catch (err) {
      setError('Patient not found or unauthorized access.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRecordAdded = () => {
    setShowAddRecord(false);
    fetchDetail(); // refresh data
  };

  // Custom submit handler for Doctor-added records
  const handleCustomSubmit = async (formData) => {
    await createDoctorPatientRecord(patientId, formData);
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <main className="dashboard-main flex-center">
          <div className="spinner"></div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-layout">
        <main className="dashboard-main">
          <div className="alert-error">⚠️ {error}</div>
          <Link to="/doctor" className="btn-ghost" style={{marginTop:'1rem'}}>← Back to Portal</Link>
        </main>
      </div>
    );
  }

  const { user, profile, healthRecords, immunizations, appointments } = data;

  return (
    <div className="dashboard-layout">
      <nav className="navbar">
        <Link to="/doctor" className="navbar-brand">
          <div className="icon">⚕️</div>
          <span>MigraHealth Doctor</span>
        </Link>
      </nav>

      <main className="dashboard-main">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <Link to="/doctor" className="breadcrumb-link">← Doctor Portal</Link>
            <h1 className="page-title">{user.name}</h1>
          </div>
          <button className="btn btn-primary" style={{width:'auto'}} onClick={() => setShowAddRecord(!showAddRecord)}>
            {showAddRecord ? 'Cancel' : '+ Add Health Record'}
          </button>
        </div>

        {/* Patient Detail Header */}
        <div className="patient-detail-header">
          <div className="pd-row">
            <strong>Phone:</strong> {user.phone}
          </div>
          <div className="pd-row">
            <strong>Language:</strong> {user.language?.toUpperCase()} 
            {user.homeState && <span> | <strong>State:</strong> {user.homeState}</span>}
          </div>
          <div className="pd-badges">
            {profile?.bloodGroup && <span className="pd-badge bg">Blood: {profile.bloodGroup}</span>}
            {profile?.dateOfBirth && <span className="pd-badge dob">DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}</span>}
          </div>
          
          {(profile?.allergies?.length > 0) && (
            <div className="pd-row critical">
              <strong>Allergies:</strong> {profile.allergies.join(', ')}
            </div>
          )}
          {(profile?.chronicConditions?.length > 0) && (
            <div className="pd-row warning">
              <strong>Conditions:</strong> {profile.chronicConditions.join(', ')}
            </div>
          )}
          {profile?.emergencyContact && (
            <div className="pd-row">
              <strong>Emergency:</strong> {profile.emergencyContact.name} ({profile.emergencyContact.relation}) - {profile.emergencyContact.phone}
            </div>
          )}
        </div>

        {/* Add Record Form Inline Toggle */}
        {showAddRecord && (
          <div className="inline-add-container">
            <h3 style={{marginBottom:'1rem'}}>Create Verified Record</h3>
            {/* Re-use HealthRecordForm */}
            <HealthRecordForm 
              userRole="doctor"
              onSuccess={handleRecordAdded} 
              onCancel={() => setShowAddRecord(false)} 
              patientId={user._id}
              customSubmitFn={handleCustomSubmit}
            />
          </div>
        )}

        <div style={{marginTop:'2rem'}}>
          <PatientTabs 
            healthRecords={healthRecords} 
            immunizations={immunizations} 
            appointments={appointments} 
            onUpdateNeeded={fetchDetail}
          />
        </div>
      </main>
    </div>
  );
};

export default PatientDetail;
