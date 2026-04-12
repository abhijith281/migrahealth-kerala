# SIH25083 — MigraHealth Kerala
## Phase 5: Doctor Portal

> **What you build in this phase:**
> A dedicated doctor experience — dashboard with quick stats,
> full list of assigned patients, and a per-patient detail page
> that combines health records + immunizations + appointments in one view.
> By the end, a doctor has everything they need in one place.

---

## What the Doctor Sees (Understand before coding)

```
Doctor Dashboard
├── Stats row: Total patients | Pending appointments | Upcoming vaccines
├── Patient list (assigned patients only)
│   └── Click a patient → Patient Detail Page
│       ├── Patient profile (blood group, allergies, conditions)
│       ├── Health Records tab
│       ├── Immunizations tab
│       └── Appointments tab
└── Quick action: Add health record for a patient
```

No new backend models needed in this phase.
This phase is mostly new API endpoints + frontend pages.

---

## New Files to Create

```
backend/
├── controllers/
│   └── doctorController.js     ← NEW
├── routes/
│   └── doctorRoutes.js         ← NEW

frontend/src/
├── pages/
│   ├── DoctorDashboard.jsx     ← NEW
│   └── PatientDetail.jsx       ← NEW
├── components/
│   ├── StatsCard.jsx           ← NEW
│   ├── PatientListItem.jsx     ← NEW
│   └── PatientTabs.jsx         ← NEW
```

---

## Step 1 — Doctor Controller (`controllers/doctorController.js`)

```js
const PatientProfile = require('../models/PatientProfile');
const HealthRecord = require('../models/HealthRecord');
const Immunization = require('../models/Immunization');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @route   GET /api/doctor/stats
// @access  doctor only
exports.getDoctorStats = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // Get all assigned patients
    const assignedProfiles = await PatientProfile.find({
      assignedDoctor: doctorId,
    });
    const patientIds = assignedProfiles.map((p) => p.user);

    // Run all stat queries in parallel
    const [
      pendingAppointments,
      todayAppointments,
      upcomingVaccines,
      totalRecords,
    ] = await Promise.all([
      Appointment.countDocuments({
        doctor: doctorId,
        status: 'pending',
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        status: { $in: ['pending', 'confirmed'] },
        appointmentDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
      Immunization.countDocuments({
        patient: { $in: patientIds },
        nextDueDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      HealthRecord.countDocuments({
        patient: { $in: patientIds },
      }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalPatients: patientIds.length,
        pendingAppointments,
        todayAppointments,
        upcomingVaccines,
        totalRecords,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/doctor/patients
// @access  doctor only
// Returns assigned patients with their profiles populated
exports.getAssignedPatients = async (req, res) => {
  try {
    const profiles = await PatientProfile.find({
      assignedDoctor: req.user.id,
    })
      .populate('user', 'name phone language homeState createdAt')
      .sort({ createdAt: -1 });

    // For each patient, get their latest appointment status
    const patientsWithLatest = await Promise.all(
      profiles.map(async (profile) => {
        const latestAppointment = await Appointment.findOne({
          patient: profile.user._id,
          doctor: req.user.id,
        })
          .sort({ appointmentDate: -1 })
          .select('status appointmentDate timeSlot');

        return {
          profile,
          latestAppointment,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: patientsWithLatest.length,
      patients: patientsWithLatest,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/doctor/patients/:patientId
// @access  doctor only — full patient detail
exports.getPatientDetail = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    // Security: confirm this patient is actually assigned to this doctor
    const profile = await PatientProfile.findOne({
      user: patientId,
      assignedDoctor: doctorId,
    }).populate('user', 'name phone language homeState createdAt');

    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'This patient is not assigned to you',
      });
    }

    // Fetch all data in parallel
    const [healthRecords, immunizations, appointments] = await Promise.all([
      HealthRecord.find({ patient: patientId })
        .sort({ visitDate: -1 })
        .populate('doctor', 'name'),
      Immunization.find({ patient: patientId })
        .sort({ administeredAt: -1 })
        .populate('vaccineType', 'name disease intervalDays')
        .populate('administeredBy', 'name'),
      Appointment.find({ patient: patientId, doctor: doctorId })
        .sort({ appointmentDate: -1 })
        .select('appointmentDate timeSlot status reason notes'),
    ]);

    res.status(200).json({
      success: true,
      patient: {
        profile,
        healthRecords,
        immunizations,
        appointments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/doctor/patients/:patientId/records
// @access  doctor only — add health record for a patient directly
exports.addRecordForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    // Security check
    const profile = await PatientProfile.findOne({
      user: patientId,
      assignedDoctor: doctorId,
    });

    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'This patient is not assigned to you',
      });
    }

    const record = await HealthRecord.create({
      ...req.body,
      patient: patientId,
      doctor: doctorId,
      isVerified: true, // doctor-created records are always verified
    });

    res.status(201).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Step 2 — Doctor Routes (`routes/doctorRoutes.js`)

```js
const express = require('express');
const router = express.Router();
const {
  getDoctorStats,
  getAssignedPatients,
  getPatientDetail,
  addRecordForPatient,
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All doctor routes require doctor role
router.use(protect, authorize('doctor'));

router.get('/stats', getDoctorStats);
router.get('/patients', getAssignedPatients);
router.get('/patients/:patientId', getPatientDetail);
router.post('/patients/:patientId/records', addRecordForPatient);

module.exports = router;
```

---

## Step 3 — Register Route in `server.js`

```js
app.use('/api/doctor', require('./routes/doctorRoutes'));
```

---

## Step 4 — Stats Card Component (`components/StatsCard.jsx`)

```jsx
export default function StatsCard({ label, value, color = '#343a40', subtitle }) {
  return (
    <div style={{
      background: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: 10,
      padding: '16px 20px',
      flex: 1,
      minWidth: 130,
    }}>
      <div style={{ fontSize: 28, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#343a40', marginTop: 2 }}>{label}</div>
      {subtitle && (
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}
```

---

## Step 5 — Patient List Item (`components/PatientListItem.jsx`)

```jsx
import { useNavigate } from 'react-router-dom';

const languageLabels = {
  ml: 'Malayalam', hi: 'Hindi', bn: 'Bengali',
  ta: 'Tamil', or: 'Odia', en: 'English',
};

const statusColors = {
  pending: { bg: '#fff3cd', color: '#856404' },
  confirmed: { bg: '#d1ecf1', color: '#0c5460' },
  completed: { bg: '#d4edda', color: '#155724' },
  cancelled: { bg: '#f8d7da', color: '#721c24' },
};

export default function PatientListItem({ patient, latestAppointment }) {
  const navigate = useNavigate();
  const { profile } = patient;
  const user = profile.user;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={() => navigate(`/doctor/patients/${user._id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        border: '1px solid #e9ecef',
        borderRadius: 10,
        marginBottom: 10,
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: '#fff',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
    >
      {/* Avatar */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: '#d1ecf1',
        color: '#0c5460',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: 15,
        flexShrink: 0,
      }}>
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 15 }}>{user.name}</div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
          {user.phone}
          {user.homeState && ` · ${user.homeState}`}
          {user.language && ` · ${languageLabels[user.language] || user.language}`}
        </div>
        {profile.bloodGroup && profile.bloodGroup !== 'Unknown' && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            Blood: {profile.bloodGroup}
            {profile.chronicConditions?.length > 0 &&
              ` · ${profile.chronicConditions.join(', ')}`}
          </div>
        )}
      </div>

      {/* Latest appointment badge */}
      {latestAppointment && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 10,
            background: statusColors[latestAppointment.status]?.bg || '#f1f3f5',
            color: statusColors[latestAppointment.status]?.color || '#495057',
          }}>
            {latestAppointment.status.toUpperCase()}
          </span>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
            {new Date(latestAppointment.appointmentDate).toLocaleDateString()}
          </div>
        </div>
      )}

      <span style={{ color: '#aaa', fontSize: 18 }}>›</span>
    </div>
  );
}
```

---

## Step 6 — Patient Tabs Component (`components/PatientTabs.jsx`)

```jsx
import { useState } from 'react';
import ImmunizationCard from './ImmunizationCard';

const recordTypeColors = {
  consultation: '#d1ecf1',
  prescription: '#d4edda',
  lab_result: '#fff3cd',
  immunization: '#e2d9f3',
  hospitalization: '#f8d7da',
  self_report: '#f1f3f5',
};

function HealthRecordMini({ record }) {
  return (
    <div style={{
      border: '1px solid #e9ecef',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 14 }}>{record.title}</strong>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 10,
          background: recordTypeColors[record.recordType] || '#f1f3f5',
        }}>
          {record.recordType.replace('_', ' ')}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
        {new Date(record.visitDate).toDateString()}
        {record.isVerified && (
          <span style={{ marginLeft: 8, color: '#155724' }}>✓ Verified</span>
        )}
      </div>
      {record.diagnosis && (
        <div style={{ fontSize: 13, marginTop: 4 }}>
          <strong>Diagnosis:</strong> {record.diagnosis}
        </div>
      )}
      {record.medications?.length > 0 && (
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          Medications: {record.medications.map(m => `${m.name} ${m.dosage}`).join(', ')}
        </div>
      )}
    </div>
  );
}

function AppointmentMini({ appointment }) {
  const statusColors = {
    pending: '#fff3cd', confirmed: '#d1ecf1',
    completed: '#d4edda', cancelled: '#f8d7da',
  };
  return (
    <div style={{
      border: '1px solid #e9ecef',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      background: statusColors[appointment.status] || '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 14 }}>
          {new Date(appointment.appointmentDate).toDateString()} — {appointment.timeSlot}
        </strong>
        <span style={{ fontSize: 12 }}>{appointment.status.toUpperCase()}</span>
      </div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Reason: {appointment.reason}</div>
      {appointment.notes && (
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Notes: {appointment.notes}</div>
      )}
    </div>
  );
}

export default function PatientTabs({ healthRecords, immunizations, appointments }) {
  const [tab, setTab] = useState('records');

  const tabStyle = (t) => ({
    padding: '6px 16px',
    borderRadius: 16,
    border: '1px solid #ddd',
    background: tab === t ? '#343a40' : 'transparent',
    color: tab === t ? '#fff' : '#333',
    cursor: 'pointer',
    fontSize: 13,
    marginRight: 8,
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button style={tabStyle('records')} onClick={() => setTab('records')}>
          Health Records ({healthRecords.length})
        </button>
        <button style={tabStyle('immunizations')} onClick={() => setTab('immunizations')}>
          Immunizations ({immunizations.length})
        </button>
        <button style={tabStyle('appointments')} onClick={() => setTab('appointments')}>
          Appointments ({appointments.length})
        </button>
      </div>

      {tab === 'records' && (
        healthRecords.length === 0
          ? <p style={{ color: '#888' }}>No health records yet.</p>
          : healthRecords.map(r => <HealthRecordMini key={r._id} record={r} />)
      )}

      {tab === 'immunizations' && (
        immunizations.length === 0
          ? <p style={{ color: '#888' }}>No immunization records yet.</p>
          : immunizations.map(r => (
            <ImmunizationCard key={r._id} record={r} showPatient={false} />
          ))
      )}

      {tab === 'appointments' && (
        appointments.length === 0
          ? <p style={{ color: '#888' }}>No appointments yet.</p>
          : appointments.map(a => <AppointmentMini key={a._id} appointment={a} />)
      )}
    </div>
  );
}
```

---

## Step 7 — Doctor Dashboard Page (`pages/DoctorDashboard.jsx`)

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import PatientListItem from '../components/PatientListItem';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, patientsRes] = await Promise.all([
          API.get('/doctor/stats'),
          API.get('/doctor/patients'),
        ]);
        setStats(statsRes.data.stats);
        setPatients(patientsRes.data.patients);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const u = p.profile.user;
    return (
      u.name.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.homeState || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 750, margin: '40px auto', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>Dr. {user?.name}</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>Doctor Portal</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/appointments">
            <button style={{ padding: '6px 14px' }}>Appointments</button>
          </Link>
          <Link to="/immunizations">
            <button style={{ padding: '6px 14px' }}>Immunizations</button>
          </Link>
          <button onClick={logout} style={{ padding: '6px 14px' }}>Logout</button>
        </div>
      </div>

      {/* Stats Row */}
      {loading ? (
        <p>Loading stats...</p>
      ) : stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatsCard label="Total Patients" value={stats.totalPatients} />
          <StatsCard
            label="Pending Appointments"
            value={stats.pendingAppointments}
            color={stats.pendingAppointments > 0 ? '#856404' : '#343a40'}
          />
          <StatsCard
            label="Today's Appointments"
            value={stats.todayAppointments}
            color={stats.todayAppointments > 0 ? '#0c5460' : '#343a40'}
          />
          <StatsCard
            label="Vaccines Due (30d)"
            value={stats.upcomingVaccines}
            color={stats.upcomingVaccines > 0 ? '#721c24' : '#343a40'}
          />
        </div>
      )}

      {/* Patient List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>My Patients ({patients.length})</h3>
      </div>

      <input
        placeholder="Search by name, phone, or state..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 12px',
          marginBottom: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
          fontSize: 14,
        }}
      />

      {loading ? (
        <p>Loading patients...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#888' }}>
          {search ? 'No patients match your search.' : 'No patients assigned yet.'}
        </p>
      ) : (
        filtered.map((p) => (
          <PatientListItem
            key={p.profile._id}
            patient={p}
            latestAppointment={p.latestAppointment}
          />
        ))
      )}
    </div>
  );
}
```

---

## Step 8 — Patient Detail Page (`pages/PatientDetail.jsx`)

```jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import PatientTabs from '../components/PatientTabs';

const languageLabels = {
  ml: 'Malayalam', hi: 'Hindi', bn: 'Bengali',
  ta: 'Tamil', or: 'Odia', en: 'English',
};

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add record form state
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({
    title: '', recordType: 'consultation',
    diagnosis: '', description: '', visitDate: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const fetchPatient = async () => {
    try {
      const { data: res } = await API.get(`/doctor/patients/${patientId}`);
      setData(res.patient);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patient');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post(`/doctor/patients/${patientId}/records`, recordForm);
      setShowAddRecord(false);
      setRecordForm({ title: '', recordType: 'consultation', diagnosis: '', description: '', visitDate: new Date().toISOString().split('T')[0] });
      await fetchPatient(); // refresh data
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add record');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading patient data...</div>;
  if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>;
  if (!data) return null;

  const { profile, healthRecords, immunizations, appointments } = data;
  const user = profile.user;

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ maxWidth: 750, margin: '40px auto', padding: 24 }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/doctor')}
        style={{ marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666' }}
      >
        ← Back to patients
      </button>

      {/* Patient Header */}
      <div style={{
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        padding: 20,
        border: '1px solid #e9ecef',
        borderRadius: 12,
        marginBottom: 24,
        background: '#f8f9fa',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#d1ecf1',
          color: '#0c5460',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 18,
          flexShrink: 0,
        }}>
          {initials}
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 4px' }}>{user.name}</h2>
          <p style={{ margin: '0 0 8px', color: '#666', fontSize: 14 }}>
            {user.phone}
            {user.homeState && ` · ${user.homeState}`}
            {user.language && ` · ${languageLabels[user.language] || user.language}`}
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile.bloodGroup && profile.bloodGroup !== 'Unknown' && (
              <span style={{ fontSize: 12, background: '#f8d7da', color: '#721c24', padding: '2px 8px', borderRadius: 10 }}>
                Blood: {profile.bloodGroup}
              </span>
            )}
            {profile.gender && (
              <span style={{ fontSize: 12, background: '#e2d9f3', color: '#4a235a', padding: '2px 8px', borderRadius: 10 }}>
                {profile.gender}
              </span>
            )}
            {profile.allergies?.map(a => (
              <span key={a} style={{ fontSize: 12, background: '#fff3cd', color: '#856404', padding: '2px 8px', borderRadius: 10 }}>
                Allergy: {a}
              </span>
            ))}
            {profile.chronicConditions?.map(c => (
              <span key={c} style={{ fontSize: 12, background: '#f8d7da', color: '#721c24', padding: '2px 8px', borderRadius: 10 }}>
                {c}
              </span>
            ))}
          </div>

          {profile.emergencyContact?.name && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>
              Emergency: {profile.emergencyContact.name} ({profile.emergencyContact.relation}) — {profile.emergencyContact.phone}
            </p>
          )}
        </div>

        {/* Add record button */}
        <button
          onClick={() => setShowAddRecord(!showAddRecord)}
          style={{ padding: '8px 14px', fontSize: 13, flexShrink: 0 }}
        >
          {showAddRecord ? 'Cancel' : '+ Add Record'}
        </button>
      </div>

      {/* Add Record Form */}
      {showAddRecord && (
        <form onSubmit={handleAddRecord} style={{
          padding: 16,
          border: '1px solid #e9ecef',
          borderRadius: 10,
          marginBottom: 24,
          background: '#fff',
        }}>
          <h4 style={{ margin: '0 0 12px' }}>Add Health Record for {user.name}</h4>

          <input
            placeholder="Title (e.g. Follow-up consultation)"
            value={recordForm.title}
            onChange={e => setRecordForm({ ...recordForm, title: e.target.value })}
            required
            style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />

          <select
            value={recordForm.recordType}
            onChange={e => setRecordForm({ ...recordForm, recordType: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          >
            <option value="consultation">Consultation</option>
            <option value="prescription">Prescription</option>
            <option value="lab_result">Lab Result</option>
            <option value="immunization">Immunization</option>
            <option value="hospitalization">Hospitalization</option>
          </select>

          <input
            placeholder="Diagnosis"
            value={recordForm.diagnosis}
            onChange={e => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />

          <textarea
            placeholder="Description / notes"
            value={recordForm.description}
            onChange={e => setRecordForm({ ...recordForm, description: e.target.value })}
            rows={2}
            style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />

          <input
            type="date"
            value={recordForm.visitDate}
            onChange={e => setRecordForm({ ...recordForm, visitDate: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />

          <button type="submit" disabled={saving} style={{ padding: '8px 20px' }}>
            {saving ? 'Saving...' : 'Save Record'}
          </button>
        </form>
      )}

      {/* Tabs: Records / Immunizations / Appointments */}
      <PatientTabs
        healthRecords={healthRecords}
        immunizations={immunizations}
        appointments={appointments}
      />
    </div>
  );
}
```

---

## Step 9 — Update `App.jsx`

```jsx
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDetail from './pages/PatientDetail';

// Inside <Routes>:
<Route
  path="/doctor"
  element={
    <ProtectedRoute allowedRoles={['doctor']}>
      <DoctorDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/doctor/patients/:patientId"
  element={
    <ProtectedRoute allowedRoles={['doctor']}>
      <PatientDetail />
    </ProtectedRoute>
  }
/>
```

Also update the main `Dashboard.jsx` — redirect doctor to `/doctor`:

```jsx
// In Dashboard.jsx, update the doctor section:
{user?.role === 'doctor' && (
  <Navigate to="/doctor" replace />
)}
```

Or simply do this in `AuthContext` after login:
```jsx
// In Login.jsx handleSubmit:
const user = await login(form.phone, form.password);
if (user.role === 'doctor') navigate('/doctor');
else navigate('/dashboard');
```

---

## Test Your Phase 5

### 1. Get doctor stats
```
GET http://localhost:5000/api/doctor/stats
(logged in as doctor)
```
Expected: totalPatients, pendingAppointments, todayAppointments, upcomingVaccines, totalRecords

### 2. Get assigned patients
```
GET http://localhost:5000/api/doctor/patients
```
Expected: Array of patients with profiles + latestAppointment

### 3. Get patient detail
```
GET http://localhost:5000/api/doctor/patients/<patientUserId>
```
Expected: Full patient object with healthRecords, immunizations, appointments arrays

### 4. Try accessing unassigned patient (should fail)
Use a patientId that is NOT assigned to this doctor.
Expected: 403 — "This patient is not assigned to you"

### 5. Add health record from doctor portal
```
POST http://localhost:5000/api/doctor/patients/<patientUserId>/records
Body:
{
  "title": "Follow-up visit",
  "recordType": "consultation",
  "diagnosis": "Recovering well",
  "visitDate": "2025-11-10"
}
```
Expected: 201, isVerified: true automatically

### 6. Frontend — search patients
Type a name, phone, or state in the search box.
Expected: List filters in real time, no API call needed

---

## Phase 5 Checklist

- [ ] Doctor stats API returns all 5 stats correctly
- [ ] `Promise.all` used for parallel stats queries (check controller)
- [ ] Assigned patients list shows with latest appointment badge
- [ ] Search filters patients client-side without extra API call
- [ ] Clicking a patient navigates to `/doctor/patients/:id`
- [ ] Patient detail page shows profile badges (blood group, allergies, conditions)
- [ ] Three tabs work: Health Records, Immunizations, Appointments
- [ ] Doctor can add a health record from patient detail page
- [ ] Added record appears in Health Records tab after save
- [ ] Unassigned patient returns 403
- [ ] Doctor role redirected to `/doctor` after login

---

## What's Next — Phase 6

You will build:
- Multilingual support using Google Translate API
- Language toggle in the UI (English / Malayalam / Hindi / Bengali)
- Translate key UI labels and health record content on demand
- This is your AI/API feature that makes the project stand out

---

## Key Decisions to Remember for Interview

| Decision | Why |
|----------|-----|
| `router.use(protect, authorize('doctor'))` on all doctor routes | Single middleware declaration covers all routes — cleaner than repeating on each route |
| Security check on patient detail | Doctor can only view patients assigned to them — data isolation at the API level, not just UI |
| `Promise.all` for stats | 4 DB queries run in parallel instead of sequentially — roughly 4x faster page load for the stats row |
| Client-side search filter | Patient list is scoped to the doctor's assigned patients (typically small — 20-50). Filtering in JS avoids an unnecessary API call and feels instant |
| `addRecordForPatient` re-checks assignment | Even though the doctor is authenticated, we verify the patient is actually theirs before creating a record — defense in depth |
| `isVerified: true` auto-set for doctor records | Any record a doctor creates is implicitly verified — consistent with the Phase 2 design decision |
