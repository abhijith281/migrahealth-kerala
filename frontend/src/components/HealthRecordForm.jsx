import { useState } from 'react';
import { createRecord } from '../utils/patientApi';

const RECORD_TYPES = [
  { value: 'self_report', label: 'Self Report', roles: ['patient'] },
  { value: 'consultation', label: 'Consultation', roles: ['doctor', 'admin'] },
  { value: 'prescription', label: 'Prescription', roles: ['doctor', 'admin'] },
  { value: 'lab_result', label: 'Lab Result', roles: ['doctor', 'admin'] },
  { value: 'immunization', label: 'Immunization', roles: ['doctor', 'admin'] },
  { value: 'hospitalization', label: 'Hospitalization', roles: ['doctor', 'admin'] },
];

const EMPTY_MED = { name: '', dosage: '', frequency: '', duration: '' };

const HealthRecordForm = ({ userRole, onSuccess, onCancel, patientId, customSubmitFn }) => {
  const availableTypes = RECORD_TYPES.filter((t) => t.roles.includes(userRole));

  const [formData, setFormData] = useState({
    recordType: availableTypes[0]?.value || 'self_report',
    title: '',
    description: '',
    diagnosis: '',
    visitDate: new Date().toISOString().split('T')[0],
    facilityName: '',
    facilityLocation: '',
    medications: [],
    patient: patientId || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setError('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Medication helpers
  const addMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [...prev.medications, { ...EMPTY_MED }],
    }));
  };

  const removeMedication = (idx) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== idx),
    }));
  };

  const handleMedChange = (idx, field, value) => {
    setFormData((prev) => {
      const meds = [...prev.medications];
      meds[idx] = { ...meds[idx], [field]: value };
      return { ...prev, medications: meds };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return setError('Title is required.');
    if (!formData.visitDate) return setError('Visit date is required.');

    setLoading(true);
    try {
      const payload = {
        recordType: formData.recordType,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        diagnosis: formData.diagnosis.trim() || undefined,
        visitDate: formData.visitDate,
        facility: {
          name: formData.facilityName.trim() || undefined,
          location: formData.facilityLocation.trim() || undefined,
        },
        medications: formData.medications.filter((m) => m.name.trim()),
      };

      // Doctor/admin must include patient ID
      if (userRole !== 'patient' && patientId) {
        payload.patient = patientId;
      }

      if (customSubmitFn) {
        await customSubmitFn(payload);
      } else {
        await createRecord(payload);
      }
      
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="record-form-overlay">
      <div className="record-form-modal">
        <div className="record-form-header">
          <h2>➕ Add Health Record</h2>
          <button className="close-btn" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        {error && (
          <div className="alert-error" role="alert">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Record Type */}
          <div className="form-group">
            <label htmlFor="rf-type">Record Type</label>
            <div className="input-wrapper">
              <span className="input-icon">📌</span>
              <select id="rf-type" name="recordType" value={formData.recordType} onChange={handleChange}>
                {availableTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label htmlFor="rf-title">Title <span className="required">*</span></label>
            <div className="input-wrapper">
              <span className="input-icon">📝</span>
              <input id="rf-title" type="text" name="title" value={formData.title}
                onChange={handleChange} placeholder="e.g. Fever and headache since 3 days" required />
            </div>
          </div>

          <div className="form-grid-2">
            {/* Visit Date */}
            <div className="form-group">
              <label htmlFor="rf-date">Visit / Record Date <span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon">📅</span>
                <input id="rf-date" type="date" name="visitDate" value={formData.visitDate}
                  onChange={handleChange} required />
              </div>
            </div>

            {/* Diagnosis */}
            <div className="form-group">
              <label htmlFor="rf-diagnosis">Diagnosis</label>
              <div className="input-wrapper">
                <span className="input-icon">🔬</span>
                <input id="rf-diagnosis" type="text" name="diagnosis" value={formData.diagnosis}
                  onChange={handleChange} placeholder="e.g. Viral fever" />
              </div>
            </div>

            {/* Facility Name */}
            <div className="form-group">
              <label htmlFor="rf-facility">Facility / Hospital Name</label>
              <div className="input-wrapper">
                <span className="input-icon">🏥</span>
                <input id="rf-facility" type="text" name="facilityName" value={formData.facilityName}
                  onChange={handleChange} placeholder="e.g. General Hospital" />
              </div>
            </div>

            {/* Facility Location */}
            <div className="form-group">
              <label htmlFor="rf-location">Facility Location</label>
              <div className="input-wrapper">
                <span className="input-icon">📍</span>
                <input id="rf-location" type="text" name="facilityLocation" value={formData.facilityLocation}
                  onChange={handleChange} placeholder="e.g. Ernakulam, Kerala" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="rf-description">Description / Symptoms</label>
            <textarea id="rf-description" name="description" value={formData.description}
              onChange={handleChange} rows={3}
              className="form-textarea"
              placeholder="Describe symptoms, history, or any notes..." />
          </div>

          {/* Medications */}
          <div className="meds-section">
            <div className="meds-header">
              <label>Medications</label>
              <button type="button" className="btn-add-med" onClick={addMedication}>
                + Add Medication
              </button>
            </div>

            {formData.medications.length === 0 && (
              <p className="meds-empty">No medications added</p>
            )}

            {formData.medications.map((med, idx) => (
              <div key={idx} className="med-row">
                <input
                  type="text" placeholder="Drug name *"
                  value={med.name}
                  onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                  className="med-input"
                />
                <input
                  type="text" placeholder="Dosage"
                  value={med.dosage}
                  onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                  className="med-input"
                />
                <input
                  type="text" placeholder="Frequency"
                  value={med.frequency}
                  onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                  className="med-input"
                />
                <input
                  type="text" placeholder="Duration"
                  value={med.duration}
                  onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                  className="med-input"
                />
                <button
                  type="button"
                  className="btn-remove-med"
                  onClick={() => removeMedication(idx)}
                  aria-label="Remove medication"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
            <button id="save-record-btn" type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HealthRecordForm;
