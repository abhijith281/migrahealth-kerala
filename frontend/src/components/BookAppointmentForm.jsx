import { useState, useEffect } from 'react';
import { getMyProfile } from '../utils/patientApi';
import { getAvailableSlots, createAppointment } from '../utils/appointmentApi';

const BookAppointmentForm = ({ onSuccess, onCancel }) => {
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Today's date for min attribute
  const today = new Date().toISOString().split('T')[0];

  // Load assigned doctor from patient profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getMyProfile();
        const profile = res.data.data;
        if (profile.assignedDoctor) {
          setDoctorId(profile.assignedDoctor._id || profile.assignedDoctor);
          setDoctorInfo(profile.assignedDoctor);
        } else {
          setProfileError('No doctor assigned. Please contact admin to assign a doctor first.');
        }
      } catch (err) {
        setProfileError('Failed to load your profile.');
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  // Fetch available slots when date changes
  useEffect(() => {
    if (!doctorId || !selectedDate) {
      setSlots([]);
      setSelectedSlot('');
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSlotsError('');
      setSelectedSlot('');
      try {
        const res = await getAvailableSlots(doctorId, selectedDate);
        setSlots(res.data.data);
        if (res.data.data.length === 0) {
          setSlotsError('No slots available on this date. Try another day.');
        }
      } catch (err) {
        setSlotsError('Failed to load available slots.');
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [doctorId, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) return setSubmitError('Please select a date.');
    if (!selectedSlot) return setSubmitError('Please select a time slot.');

    setSubmitting(true);
    setSubmitError('');
    try {
      await createAppointment({
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        reason: reason.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="record-form-overlay">
      <div className="record-form-modal" style={{ maxWidth: 540 }}>
        <div className="record-form-header">
          <h2>📅 Book Appointment</h2>
          <button className="close-btn" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        {/* Loading profile */}
        {loadingProfile ? (
          <div className="records-loading" style={{ padding: '2rem 0' }}>
            <div className="spinner"></div>
            <span>Loading your doctor info...</span>
          </div>
        ) : profileError ? (
          <div className="appt-no-doctor">
            <div className="appt-no-doctor-icon">⚠️</div>
            <p>{profileError}</p>
            <button className="btn-ghost" onClick={onCancel}>Close</button>
          </div>
        ) : (
          <>
            {/* Assigned Doctor Info */}
            <div className="appt-doctor-banner">
              <div className="appt-doctor-avatar">⚕️</div>
              <div>
                <p className="appt-doctor-name">
                  Dr. {doctorInfo?.name || 'Your Assigned Doctor'}
                </p>
                {doctorInfo?.phone && (
                  <p className="appt-doctor-phone">📱 {doctorInfo.phone}</p>
                )}
              </div>
            </div>

            {submitError && (
              <div className="alert-error" role="alert">
                <span>⚠️</span><span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Date picker */}
              <div className="form-group">
                <label htmlFor="appt-date">Select Date <span className="required">*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon">📅</span>
                  <input
                    id="appt-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={today}
                    required
                  />
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="form-group">
                  <label>Available Time Slots <span className="required">*</span></label>

                  {loadingSlots ? (
                    <div className="records-loading" style={{ padding: '1rem 0', justifyContent: 'flex-start' }}>
                      <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }}></div>
                      <span>Checking slots...</span>
                    </div>
                  ) : slotsError ? (
                    <div className="slots-empty">
                      <span>😔</span> {slotsError}
                    </div>
                  ) : (
                    <div className="slots-grid">
                      {slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                          onClick={() => { setSelectedSlot(slot); setSubmitError(''); }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="form-group">
                <label htmlFor="appt-reason">Reason for Visit</label>
                <textarea
                  id="appt-reason"
                  className="form-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your symptoms or reason for the visit..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
                <button
                  id="book-appt-btn"
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: 'auto' }}
                  disabled={submitting || !selectedSlot}
                >
                  {submitting ? 'Booking...' : '📅 Book Appointment'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default BookAppointmentForm;
