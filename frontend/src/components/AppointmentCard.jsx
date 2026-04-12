import { useState } from 'react';
import { updateAppointmentStatus } from '../utils/appointmentApi';

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  confirmed: { label: 'Confirmed', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' },
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

const AppointmentCard = ({ appointment, userRole, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cancel prompt state
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Complete prompt state (doctor only)
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');

  const meta = STATUS_META[appointment.status] || STATUS_META.pending;
  const isTerminal = ['completed', 'cancelled'].includes(appointment.status);

  const handleAction = async (newStatus, extras = {}) => {
    setLoading(true);
    setError('');
    try {
      await updateAppointmentStatus(appointment._id, { status: newStatus, ...extras });
      setShowCancelPrompt(false);
      setShowCompletePrompt(false);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`appt-card ${appointment.status}`}>
      {/* Left: date block */}
      <div className="appt-card-date">
        <span className="appt-day">
          {new Date(appointment.appointmentDate).getDate()}
        </span>
        <span className="appt-month">
          {new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { month: 'short' })}
        </span>
      </div>

      {/* Main body */}
      <div className="appt-card-body">
        <div className="appt-card-top">
          <span className="appt-time">🕐 {appointment.timeSlot}</span>
          <span
            className="appt-status-badge"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
          >
            {meta.label}
          </span>
        </div>

        <p className="appt-card-date-full">{formatDate(appointment.appointmentDate)}</p>

        {/* Who — show other party */}
        {userRole === 'patient' && appointment.doctor?.name && (
          <p className="appt-card-meta">⚕️ Dr. {appointment.doctor.name}</p>
        )}
        {(userRole === 'doctor' || userRole === 'admin') && appointment.patient?.name && (
          <p className="appt-card-meta">👤 {appointment.patient.name}
            {appointment.patient.phone && <span> · 📱 {appointment.patient.phone}</span>}
          </p>
        )}

        {appointment.reason && (
          <p className="appt-card-reason">
            <strong>Reason:</strong> {appointment.reason}
          </p>
        )}

        {/* Cancelled info */}
        {appointment.status === 'cancelled' && (
          <div className="appt-cancelled-info">
            {appointment.cancelledBy && (
              <span className="appt-cancelled-by">Cancelled by: {appointment.cancelledBy}</span>
            )}
            {appointment.cancellationReason && (
              <p className="appt-cancel-reason">"{appointment.cancellationReason}"</p>
            )}
          </div>
        )}

        {/* Completed info */}
        {appointment.status === 'completed' && appointment.notes && (
          <div className="appt-notes">
            <strong>Doctor Notes:</strong>
            <p>{appointment.notes}</p>
          </div>
        )}

        {appointment.linkedRecord && (
          <p className="appt-card-meta" style={{ marginTop: '0.25rem' }}>
            📋 Linked: {appointment.linkedRecord.title || 'Health Record'}
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="alert-error" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* ── Action buttons ─────────────────────────── */}
        {!isTerminal && (
          <div className="appt-actions">

            {/* Doctor: confirm */}
            {userRole === 'doctor' && appointment.status === 'pending' && (
              <button
                className="appt-btn appt-btn-confirm"
                onClick={() => handleAction('confirmed')}
                disabled={loading}
              >
                {loading ? '...' : '✓ Confirm'}
              </button>
            )}

            {/* Doctor: complete */}
            {userRole === 'doctor' && appointment.status === 'confirmed' && !showCompletePrompt && (
              <button
                className="appt-btn appt-btn-complete"
                onClick={() => setShowCompletePrompt(true)}
                disabled={loading}
              >
                ✓ Mark Complete
              </button>
            )}

            {/* Doctor: complete prompt */}
            {showCompletePrompt && (
              <div className="appt-prompt">
                <textarea
                  className="form-textarea"
                  placeholder="Add consultation notes (optional)..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  rows={2}
                />
                <div className="appt-prompt-actions">
                  <button
                    className="appt-btn appt-btn-complete"
                    onClick={() => handleAction('completed', { notes: completeNotes || undefined })}
                    disabled={loading}
                  >
                    {loading ? '...' : 'Complete'}
                  </button>
                  <button className="appt-btn appt-btn-ghost" onClick={() => setShowCompletePrompt(false)}>
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Anyone can cancel (patient/doctor/admin) — show prompt */}
            {!showCancelPrompt && !showCompletePrompt && (
              <button
                className="appt-btn appt-btn-cancel"
                onClick={() => setShowCancelPrompt(true)}
                disabled={loading}
              >
                ✕ Cancel
              </button>
            )}

            {/* Cancel prompt */}
            {showCancelPrompt && (
              <div className="appt-prompt">
                <input
                  type="text"
                  className="appt-cancel-input"
                  placeholder="Reason for cancellation (optional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <div className="appt-prompt-actions">
                  <button
                    className="appt-btn appt-btn-cancel"
                    onClick={() => handleAction('cancelled', { cancellationReason: cancelReason || undefined })}
                    disabled={loading}
                  >
                    {loading ? '...' : 'Confirm Cancel'}
                  </button>
                  <button className="appt-btn appt-btn-ghost" onClick={() => setShowCancelPrompt(false)}>
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Admin: confirm if pending */}
            {userRole === 'admin' && appointment.status === 'pending' && (
              <button
                className="appt-btn appt-btn-confirm"
                onClick={() => handleAction('confirmed')}
                disabled={loading}
              >
                {loading ? '...' : '✓ Confirm'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;
