import { useState, useEffect } from 'react';
import { getVaccineTypes, createImmunization } from '../utils/immunizationApi';
import { getMyPatients } from '../utils/patientApi'; // Assumes patientApi has getMyPatients for doctors

const AddImmunizationForm = ({ onSuccess, onCancel }) => {
  const [patients, setPatients] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [errorConfig, setErrorConfig] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    patient: '',
    vaccineType: '',
    administeredAt: today,
    batchNumber: '',
    facilityName: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const [patientsRes, vaccinesRes] = await Promise.all([
          getMyPatients(),
          getVaccineTypes()
        ]);
        setPatients(patientsRes.data.data);
        setVaccines(vaccinesRes.data.data);
      } catch (err) {
        setErrorConfig('Failed to load required data. Please try again later.');
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfigData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        patient: formData.patient,
        vaccineType: formData.vaccineType,
        administeredAt: formData.administeredAt,
        batchNumber: formData.batchNumber,
        facility: formData.facilityName ? { name: formData.facilityName } : undefined,
        notes: formData.notes
      };
      
      await createImmunization(payload);
      onSuccess();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to record immunization.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="record-form-overlay">
        <div className="record-form-modal">
          <div className="records-loading">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (errorConfig) {
    return (
      <div className="record-form-overlay">
        <div className="record-form-modal">
          <div className="alert-error">
            <span>⚠️</span><span>{errorConfig}</span>
          </div>
          <button className="btn-ghost" onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="record-form-overlay">
      <div className="record-form-modal" style={{ maxWidth: 600 }}>
        <div className="record-form-header">
          <h2>💉 Record Immunization</h2>
          <button className="close-btn" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        {submitError && (
          <div className="alert-error" role="alert">
            <span>⚠️</span><span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Patient <span className="required">*</span></label>
            <select name="patient" className="no-icon" value={formData.patient} onChange={handleChange} required>
              <option value="">-- Select Assigned Patient --</option>
              {patients.map(p => (
                <option key={p.user._id} value={p.user._id}>{p.user.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Vaccine Type <span className="required">*</span></label>
            <select name="vaccineType" className="no-icon" value={formData.vaccineType} onChange={handleChange} required>
              <option value="">-- Select Vaccine --</option>
              {vaccines.map(v => (
                <option key={v._id} value={v._id}>{v.name} ({v.disease})</option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Administered Date <span className="required">*</span></label>
              <input 
                type="date" 
                name="administeredAt" 
                className="no-icon" 
                value={formData.administeredAt} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Batch Number</label>
              <input 
                type="text" 
                name="batchNumber" 
                className="no-icon" 
                value={formData.batchNumber} 
                onChange={handleChange} 
                placeholder="e.g. BATCH-1234"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Facility Name</label>
            <input 
              type="text" 
              name="facilityName" 
              className="no-icon" 
              value={formData.facilityName} 
              onChange={handleChange} 
              placeholder="e.g. Govt Hospital Kochi"
            />
          </div>
          
          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              className="form-textarea"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any observation..."
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={submitting}>
              {submitting ? 'Saving...' : '💾 Record Immunization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddImmunizationForm;
