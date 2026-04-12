# SIH25083 — MigraHealth Kerala
## Phase 3: Appointment Booking System

> **What you build in this phase:**
> Patients can book appointments with their assigned doctor.
> Doctors can confirm or cancel appointments.
> Appointments have a clear status flow: pending → confirmed → completed / cancelled.
> By the end, the full booking lifecycle works end to end.

---

## Status Flow (Understand before coding)

```
Patient books → [pending]
                    ↓
Doctor confirms → [confirmed]
                    ↓
Visit happens → [completed]   OR   Doctor/Patient cancels → [cancelled]
```

Only these 4 statuses exist. No other state is valid.

---

## New Files to Create

```
backend/
├── models/
│   └── Appointment.js         ← NEW
├── controllers/
│   └── appointmentController.js  ← NEW
├── routes/
│   └── appointmentRoutes.js   ← NEW

frontend/src/
├── pages/
│   └── Appointments.jsx       ← NEW
├── components/
│   ├── BookAppointmentForm.jsx ← NEW
│   └── AppointmentCard.jsx    ← NEW
```

---

## Step 1 — Appointment Model (`models/Appointment.js`)

```js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      // e.g. "10:00 AM", "2:30 PM"
    },
    reason: {
      type: String,
      required: [true, 'Reason for visit is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin', null],
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    notes: {
      // Doctor adds notes after the appointment
      type: String,
      default: null,
    },
    linkedRecord: {
      // After appointment, doctor can link a health record created during this visit
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthRecord',
      default: null,
    },
  },
  { timestamps: true }
);

// Index for common queries
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
```

### Why this schema? (Interview Answer)
- **`cancelledBy` field** — knowing WHO cancelled is important for analytics and dispute resolution; a patient cancellation vs doctor cancellation are different events
- **`linkedRecord`** — creates traceability between an appointment and the health record created during it; connects Phase 2 and Phase 3 data
- **3 indexes** — patient queries their history (index 1), doctor sees their schedule (index 2), checking slot availability by status (index 3)
- **`notes` separate from HealthRecord** — quick doctor notes during appointment are different from a formal health record entry

---

## Step 2 — Appointment Controller (`controllers/appointmentController.js`)

```js
const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');

// @route   POST /api/appointments
// @access  patient only
exports.bookAppointment = async (req, res) => {
  try {
    const { appointmentDate, timeSlot, reason } = req.body;

    // Get patient's assigned doctor
    const profile = await PatientProfile.findOne({ user: req.user.id });

    if (!profile || !profile.assignedDoctor) {
      return res.status(400).json({
        success: false,
        message: 'You do not have an assigned doctor. Contact admin.',
      });
    }

    // Check if this time slot is already taken by this doctor
    const slotTaken = await Appointment.findOne({
      doctor: profile.assignedDoctor,
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (slotTaken) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked. Please choose another.',
      });
    }

    const appointment = await Appointment.create({
      patient: req.user.id,
      doctor: profile.assignedDoctor,
      appointmentDate,
      timeSlot,
      reason,
    });

    await appointment.populate('doctor', 'name phone');

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/appointments
// @access  patient (own), doctor (their schedule), admin (all)
exports.getAppointments = async (req, res) => {
  try {
    let query = {};
    const { status } = req.query; // optional filter by status

    if (req.user.role === 'patient') {
      query.patient = req.user.id;
    } else if (req.user.role === 'doctor') {
      query.doctor = req.user.id;
    }
    // admin: no filter — sees all

    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: -1 })
      .populate('patient', 'name phone language')
      .populate('doctor', 'name phone')
      .populate('linkedRecord', 'title recordType');

    res.status(200).json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/appointments/:id
// @access  patient (own) or doctor (their appointment)
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name phone language homeState')
      .populate('doctor', 'name phone')
      .populate('linkedRecord');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Ownership check
    const isPatient = appointment.patient._id.toString() === req.user.id;
    const isDoctor = appointment.doctor._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PATCH /api/appointments/:id/status
// @access  doctor (confirm/complete), patient or doctor (cancel)
exports.updateStatus = async (req, res) => {
  try {
    const { status, cancellationReason, notes, linkedRecord } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const isPatient = appointment.patient.toString() === req.user.id;
    const isDoctor = appointment.doctor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Define what each role can do
    const allowedTransitions = {
      doctor: ['confirmed', 'completed', 'cancelled'],
      patient: ['cancelled'],
      admin: ['confirmed', 'completed', 'cancelled'],
    };

    if (!allowedTransitions[req.user.role]?.includes(status)) {
      return res.status(403).json({
        success: false,
        message: `Your role cannot set status to '${status}'`,
      });
    }

    // Additional ownership check
    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Prevent invalid transitions
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of a ${appointment.status} appointment`,
      });
    }

    appointment.status = status;

    if (status === 'cancelled') {
      appointment.cancelledBy = req.user.role;
      appointment.cancellationReason = cancellationReason || null;
    }

    if (status === 'completed') {
      if (notes) appointment.notes = notes;
      if (linkedRecord) appointment.linkedRecord = linkedRecord;
    }

    await appointment.save();
    await appointment.populate('patient', 'name phone');
    await appointment.populate('doctor', 'name phone');

    res.status(200).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/appointments/slots/:doctorId
// @access  patient (check available slots for a date)
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    const { doctorId } = req.params;

    const allSlots = [
      '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
      '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM',
      '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
    ];

    // Find already booked slots for this doctor on this date
    const booked = await Appointment.find({
      doctor: doctorId,
      appointmentDate: new Date(date),
      status: { $in: ['pending', 'confirmed'] },
    }).select('timeSlot');

    const bookedSlots = booked.map((a) => a.timeSlot);
    const availableSlots = allSlots.filter((s) => !bookedSlots.includes(s));

    res.status(200).json({ success: true, availableSlots, bookedSlots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Step 3 — Routes (`routes/appointmentRoutes.js`)

```js
const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getAppointments,
  getAppointmentById,
  updateStatus,
  getAvailableSlots,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('patient'), bookAppointment);
router.get('/', protect, getAppointments);
router.get('/slots/:doctorId', protect, authorize('patient'), getAvailableSlots);
router.get('/:id', protect, getAppointmentById);
router.patch('/:id/status', protect, updateStatus);

module.exports = router;
```

---

## Step 4 — Register Route in `server.js`

Add this line:

```js
app.use('/api/appointments', require('./routes/appointmentRoutes'));
```

---

## Step 5 — Book Appointment Form (`components/BookAppointmentForm.jsx`)

```jsx
import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function BookAppointmentForm({ onSuccess }) {
  const [form, setForm] = useState({
    appointmentDate: '',
    timeSlot: '',
    reason: '',
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [doctorId, setDoctorId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get assigned doctor from patient profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get('/patients/profile');
        setDoctorId(data.profile.assignedDoctor?._id);
      } catch (err) {
        setError('Could not load your profile. Contact admin.');
      }
    };
    fetchProfile();
  }, []);

  // Fetch available slots when date changes
  useEffect(() => {
    if (!form.appointmentDate || !doctorId) return;
    const fetchSlots = async () => {
      try {
        const { data } = await API.get(
          `/appointments/slots/${doctorId}?date=${form.appointmentDate}`
        );
        setAvailableSlots(data.availableSlots);
        setForm((f) => ({ ...f, timeSlot: '' }));
      } catch {
        setAvailableSlots([]);
      }
    };
    fetchSlots();
  }, [form.appointmentDate, doctorId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await API.post('/appointments', form);
      onSuccess();
      setForm({ appointmentDate: '', timeSlot: '', reason: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  // Disable past dates
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h3>Book Appointment</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!doctorId && !error && (
        <p style={{ color: 'orange' }}>No assigned doctor found. Contact admin to assign one.</p>
      )}

      <input
        type="date"
        min={today}
        value={form.appointmentDate}
        onChange={e => setForm({ ...form, appointmentDate: e.target.value })}
        required
        disabled={!doctorId}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />

      <select
        value={form.timeSlot}
        onChange={e => setForm({ ...form, timeSlot: e.target.value })}
        required
        disabled={!form.appointmentDate || availableSlots.length === 0}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      >
        <option value="">
          {form.appointmentDate
            ? availableSlots.length === 0
              ? 'No slots available for this date'
              : 'Select a time slot'
            : 'Select date first'}
        </option>
        {availableSlots.map((slot) => (
          <option key={slot} value={slot}>{slot}</option>
        ))}
      </select>

      <textarea
        placeholder="Reason for visit"
        value={form.reason}
        onChange={e => setForm({ ...form, reason: e.target.value })}
        required
        rows={2}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />

      <button type="submit" disabled={loading || !doctorId} style={{ padding: '8px 20px' }}>
        {loading ? 'Booking...' : 'Book Appointment'}
      </button>
    </form>
  );
}
```

---

## Step 6 — Appointment Card (`components/AppointmentCard.jsx`)

```jsx
import { useState } from 'react';
import API from '../api/axios';

const statusColors = {
  pending: { bg: '#fff3cd', color: '#856404' },
  confirmed: { bg: '#d1ecf1', color: '#0c5460' },
  completed: { bg: '#d4edda', color: '#155724' },
  cancelled: { bg: '#f8d7da', color: '#721c24' },
};

export default function AppointmentCard({ appointment, userRole, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const updateStatus = async (status, extra = {}) => {
    setLoading(true);
    try {
      await API.patch(`/appointments/${appointment._id}/status`, { status, ...extra });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const colors = statusColors[appointment.status];

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{new Date(appointment.appointmentDate).toDateString()}</strong>
          <span style={{ marginLeft: 8, color: '#666' }}>{appointment.timeSlot}</span>
        </div>
        <span style={{
          fontSize: 12,
          padding: '3px 10px',
          borderRadius: 12,
          background: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}>
          {appointment.status.toUpperCase()}
        </span>
      </div>

      <p style={{ margin: '8px 0 4px', fontSize: 14 }}>
        <strong>Reason:</strong> {appointment.reason}
      </p>

      {userRole === 'doctor' && (
        <p style={{ fontSize: 13, color: '#666' }}>
          Patient: {appointment.patient?.name} ({appointment.patient?.phone})
        </p>
      )}

      {userRole === 'patient' && (
        <p style={{ fontSize: 13, color: '#666' }}>
          Doctor: {appointment.doctor?.name}
        </p>
      )}

      {appointment.notes && (
        <p style={{ fontSize: 13, background: '#f8f9fa', padding: 8, borderRadius: 4, marginTop: 8 }}>
          <strong>Doctor notes:</strong> {appointment.notes}
        </p>
      )}

      {appointment.cancellationReason && (
        <p style={{ fontSize: 13, color: '#721c24', marginTop: 4 }}>
          Cancelled by {appointment.cancelledBy}: {appointment.cancellationReason}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {/* Doctor actions */}
        {userRole === 'doctor' && appointment.status === 'pending' && (
          <>
            <button
              onClick={() => updateStatus('confirmed')}
              disabled={loading}
              style={{ padding: '6px 14px', background: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: 4, cursor: 'pointer' }}
            >
              Confirm
            </button>
            <button
              onClick={() => {
                const reason = prompt('Reason for cancellation?');
                if (reason) updateStatus('cancelled', { cancellationReason: reason });
              }}
              disabled={loading}
              style={{ padding: '6px 14px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </>
        )}

        {userRole === 'doctor' && appointment.status === 'confirmed' && (
          <>
            <button
              onClick={() => setShowNotes(!showNotes)}
              style={{ padding: '6px 14px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 4, cursor: 'pointer' }}
            >
              Mark Completed
            </button>
            <button
              onClick={() => {
                const reason = prompt('Reason for cancellation?');
                if (reason) updateStatus('cancelled', { cancellationReason: reason });
              }}
              disabled={loading}
              style={{ padding: '6px 14px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </>
        )}

        {/* Patient actions */}
        {userRole === 'patient' &&
          (appointment.status === 'pending' || appointment.status === 'confirmed') && (
            <button
              onClick={() => {
                const reason = prompt('Reason for cancellation?');
                if (reason) updateStatus('cancelled', { cancellationReason: reason });
              }}
              disabled={loading}
              style={{ padding: '6px 14px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, cursor: 'pointer' }}
            >
              Cancel Appointment
            </button>
          )}
      </div>

      {/* Notes input for completing appointment */}
      {showNotes && (
        <div style={{ marginTop: 12 }}>
          <textarea
            placeholder="Add visit notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8 }}
          />
          <button
            onClick={() => updateStatus('completed', { notes })}
            disabled={loading}
            style={{ padding: '6px 14px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 4, cursor: 'pointer' }}
          >
            {loading ? 'Saving...' : 'Confirm Completion'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Step 7 — Appointments Page (`pages/Appointments.jsx`)

```jsx
import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import BookAppointmentForm from '../components/BookAppointmentForm';
import AppointmentCard from '../components/AppointmentCard';

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchAppointments = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const { data } = await API.get(`/appointments${params}`);
      setAppointments(data.appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <h2>Appointments</h2>

      {user?.role === 'patient' && (
        <BookAppointmentForm onSuccess={fetchAppointments} />
      )}

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '4px 12px',
              borderRadius: 16,
              border: '1px solid #ddd',
              background: filter === s ? '#343a40' : 'transparent',
              color: filter === s ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        appointments.map((a) => (
          <AppointmentCard
            key={a._id}
            appointment={a}
            userRole={user?.role}
            onRefresh={fetchAppointments}
          />
        ))
      )}
    </div>
  );
}
```

---

## Step 8 — Add Route to `App.jsx`

```jsx
import Appointments from './pages/Appointments';

// Inside <Routes>:
<Route
  path="/appointments"
  element={<ProtectedRoute><Appointments /></ProtectedRoute>}
/>
```

Also add Appointments link to `Dashboard.jsx`:

```jsx
<Link to="/appointments"><button>Appointments</button></Link>
```

---

## Test Your Phase 3

### 1. First — assign a doctor to the test patient via MongoDB Atlas
Go to your `patientprofiles` collection and manually set:
```json
{ "assignedDoctor": "<doctorUserId>" }
```

### 2. Book an appointment (as patient)
```
POST http://localhost:5000/api/appointments
Body:
{
  "appointmentDate": "2025-12-15",
  "timeSlot": "10:00 AM",
  "reason": "Fever and headache for 3 days"
}
```
Expected: 201, status = "pending"

### 3. Try booking same slot again (should fail)
Same body as above.
Expected: 400 — "This time slot is already booked"

### 4. Get available slots (as patient)
```
GET http://localhost:5000/api/appointments/slots/<doctorId>?date=2025-12-15
```
Expected: 10:00 AM missing from availableSlots

### 5. Confirm appointment (as doctor)
```
PATCH http://localhost:5000/api/appointments/<id>/status
Body: { "status": "confirmed" }
```
Expected: status = "confirmed"

### 6. Try patient confirming (should fail)
Same request as patient user.
Expected: 403 — "Your role cannot set status to 'confirmed'"

### 7. Complete appointment (as doctor)
```
PATCH http://localhost:5000/api/appointments/<id>/status
Body: { "status": "completed", "notes": "Prescribed Paracetamol 500mg" }
```
Expected: status = "completed", notes saved

### 8. Try changing completed appointment (should fail)
Any status change on a completed appointment.
Expected: 400 — "Cannot change status of a completed appointment"

---

## Phase 3 Checklist

- [ ] Patient can book appointment only with assigned doctor
- [ ] Duplicate slot booking is rejected with clear message
- [ ] Available slots API removes already-booked slots
- [ ] Doctor can confirm a pending appointment
- [ ] Doctor can mark appointment as completed with notes
- [ ] Patient can cancel their own pending or confirmed appointment
- [ ] Patient cannot confirm appointments (403 returned)
- [ ] Completed/cancelled appointments cannot be changed
- [ ] Frontend filter buttons work (all / pending / confirmed / completed / cancelled)
- [ ] AppointmentCard shows correct action buttons per role and status

---

## What's Next — Phase 4

You will build:
- Immunization tracking (vaccination history per patient)
- Immunization schedule (upcoming due vaccines)
- Admin can add new vaccine types to the system
- Patient and doctor can view immunization history

---

## Key Decisions to Remember for Interview

| Decision | Why |
|----------|-----|
| Slot conflict check before booking | Prevents double-booking at the DB query level, not just frontend — frontend validation alone is not reliable |
| `cancelledBy` stored as a field | Audit trail — if a patient disputes a cancellation, you can prove who cancelled |
| PATCH instead of PUT for status update | Partial update — only the status changes, not the whole document. REST convention |
| Status transition guard | Prevents impossible state changes (e.g., completing an already-cancelled appointment) — business logic lives in the backend, not just the UI |
| `linkedRecord` on appointment | Traceability — connects appointment → health record, enabling a full patient visit history view |
| Slots defined as constants in backend | Slot management controlled server-side; frontend cannot invent arbitrary slots |