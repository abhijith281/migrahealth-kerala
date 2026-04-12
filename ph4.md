# SIH25083 — MigraHealth Kerala
## Phase 4: Immunization Tracking

> **What you build in this phase:**
> A complete vaccination history system per patient.
> Admin adds vaccine types to the system.
> Doctors record immunizations given to patients.
> Patients view their vaccination history and upcoming due vaccines.
> By the end, the immunization module works independently and connects to health records.

---

## How It Works (Understand before coding)

```
Admin creates VaccineType  →  "BCG", "Hepatitis B Dose 1", "COVID-19"
                                        ↓
Doctor records Immunization  →  links patient + vaccineType + date given + next due date
                                        ↓
Patient views history  →  past vaccines + upcoming due dates highlighted
```

Two models: `VaccineType` (master list) and `Immunization` (per-patient record).

---

## New Files to Create

```
backend/
├── models/
│   ├── VaccineType.js           ← NEW
│   └── Immunization.js          ← NEW
├── controllers/
│   ├── vaccineTypeController.js ← NEW
│   └── immunizationController.js ← NEW
├── routes/
│   ├── vaccineTypeRoutes.js     ← NEW
│   └── immunizationRoutes.js    ← NEW

frontend/src/
├── pages/
│   └── Immunizations.jsx        ← NEW
├── components/
│   ├── AddImmunizationForm.jsx  ← NEW
│   └── ImmunizationCard.jsx     ← NEW
```

---

## Step 1 — VaccineType Model (`models/VaccineType.js`)

```js
const mongoose = require('mongoose');

const vaccineTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vaccine name is required'],
      unique: true,
      trim: true,
      // e.g. "BCG", "Hepatitis B - Dose 1", "COVID-19 Booster"
    },
    disease: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Tuberculosis", "Hepatitis B", "COVID-19"
    },
    description: {
      type: String,
      trim: true,
    },
    recommendedAgeMonths: {
      type: Number,
      // Recommended age in months — 0 = at birth, 12 = 1 year, etc.
      default: null,
    },
    intervalDays: {
      type: Number,
      // Days until next dose is due (null = single dose vaccine)
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      // Admin can deactivate without deleting
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VaccineType', vaccineTypeSchema);
```

### Why this schema? (Interview Answer)
- **Master list pattern** — VaccineType is a lookup/reference table. Separating it from Immunization prevents data duplication and lets admin update vaccine info in one place
- **`intervalDays`** — drives the "next due date" calculation automatically; no manual date entry needed for the next dose
- **`isActive` instead of delete** — if a vaccine is retired, you can't delete it because existing immunization records reference it; soft delete preserves data integrity
- **`recommendedAgeMonths`** — enables future feature of alerting patients about age-appropriate vaccines they haven't received yet

---

## Step 2 — Immunization Model (`models/Immunization.js`)

```js
const mongoose = require('mongoose');

const immunizationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vaccineType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VaccineType',
      required: true,
    },
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // doctor who gave the vaccine
      default: null,
    },
    administeredAt: {
      type: Date,
      required: [true, 'Date of administration is required'],
      default: Date.now,
    },
    nextDueDate: {
      type: Date,
      default: null,
      // Calculated from administeredAt + vaccineType.intervalDays
    },
    batchNumber: {
      type: String,
      trim: true,
      default: null,
      // Vaccine batch number for traceability
    },
    facility: {
      name: { type: String },
      location: { type: String },
    },
    sideEffects: {
      type: String,
      default: null,
      // Any observed side effects noted by doctor
    },
    linkedAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index — patient's immunization history sorted by date
immunizationSchema.index({ patient: 1, administeredAt: -1 });

// Prevent duplicate: same patient + same vaccine on same day
immunizationSchema.index(
  { patient: 1, vaccineType: 1, administeredAt: 1 },
  { unique: true }
);

module.exports = mongoose.model('Immunization', immunizationSchema);
```

### Why this schema? (Interview Answer)
- **Unique compound index on patient+vaccine+date** — prevents accidental duplicate recording of the same vaccine on the same day
- **`batchNumber`** — in real public health systems, batch tracking is mandatory for recalls; shows awareness of real-world requirements
- **`nextDueDate` stored, not calculated on the fly** — pre-computing and storing it makes querying "upcoming due vaccines" simple and fast with a single date comparison
- **`linkedAppointment`** — if vaccine was given during an appointment, creates a full audit trail

---

## Step 3 — VaccineType Controller (`controllers/vaccineTypeController.js`)

```js
const VaccineType = require('../models/VaccineType');

// @route   POST /api/vaccine-types
// @access  admin only
exports.createVaccineType = async (req, res) => {
  try {
    const vaccine = await VaccineType.create(req.body);
    res.status(201).json({ success: true, vaccine });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Vaccine type already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/vaccine-types
// @access  all authenticated users
exports.getVaccineTypes = async (req, res) => {
  try {
    const vaccines = await VaccineType.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, count: vaccines.length, vaccines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/vaccine-types/:id
// @access  admin only
exports.updateVaccineType = async (req, res) => {
  try {
    const vaccine = await VaccineType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vaccine) return res.status(404).json({ success: false, message: 'Vaccine type not found' });
    res.status(200).json({ success: true, vaccine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PATCH /api/vaccine-types/:id/deactivate
// @access  admin only
exports.deactivateVaccineType = async (req, res) => {
  try {
    const vaccine = await VaccineType.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!vaccine) return res.status(404).json({ success: false, message: 'Vaccine type not found' });
    res.status(200).json({ success: true, message: 'Vaccine deactivated', vaccine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Step 4 — Immunization Controller (`controllers/immunizationController.js`)

```js
const Immunization = require('../models/Immunization');
const VaccineType = require('../models/VaccineType');
const PatientProfile = require('../models/PatientProfile');

// @route   POST /api/immunizations
// @access  doctor only
exports.recordImmunization = async (req, res) => {
  try {
    const {
      patientId,
      vaccineTypeId,
      administeredAt,
      batchNumber,
      facility,
      sideEffects,
      linkedAppointment,
      notes,
    } = req.body;

    // Fetch vaccine type to calculate nextDueDate
    const vaccineType = await VaccineType.findById(vaccineTypeId);
    if (!vaccineType) {
      return res.status(404).json({ success: false, message: 'Vaccine type not found' });
    }

    // Calculate next due date if vaccine has an interval
    let nextDueDate = null;
    if (vaccineType.intervalDays) {
      const givenDate = new Date(administeredAt || Date.now());
      nextDueDate = new Date(givenDate);
      nextDueDate.setDate(nextDueDate.getDate() + vaccineType.intervalDays);
    }

    const immunization = await Immunization.create({
      patient: patientId,
      vaccineType: vaccineTypeId,
      administeredBy: req.user.id,
      administeredAt: administeredAt || Date.now(),
      nextDueDate,
      batchNumber,
      facility,
      sideEffects,
      linkedAppointment,
      notes,
    });

    await immunization.populate('vaccineType', 'name disease intervalDays');
    await immunization.populate('administeredBy', 'name');

    res.status(201).json({ success: true, immunization });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This vaccine is already recorded for this patient on this date',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/immunizations
// @access  patient (own), doctor (assigned patients), admin (all)
exports.getImmunizations = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patient') {
      query.patient = req.user.id;
    } else if (req.user.role === 'doctor') {
      const profiles = await PatientProfile.find({ assignedDoctor: req.user.id });
      const patientIds = profiles.map((p) => p.user);
      query.patient = { $in: patientIds };
    }
    // admin: no filter

    const immunizations = await Immunization.find(query)
      .sort({ administeredAt: -1 })
      .populate('vaccineType', 'name disease description intervalDays')
      .populate('patient', 'name phone')
      .populate('administeredBy', 'name');

    res.status(200).json({ success: true, count: immunizations.length, immunizations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/immunizations/upcoming
// @access  patient (own upcoming), doctor (assigned patients upcoming)
exports.getUpcomingDue = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    let patientFilter = {};

    if (req.user.role === 'patient') {
      patientFilter.patient = req.user.id;
    } else if (req.user.role === 'doctor') {
      const profiles = await PatientProfile.find({ assignedDoctor: req.user.id });
      const patientIds = profiles.map((p) => p.user);
      patientFilter.patient = { $in: patientIds };
    }

    const upcoming = await Immunization.find({
      ...patientFilter,
      nextDueDate: {
        $gte: today,
        $lte: thirtyDaysLater,
      },
    })
      .sort({ nextDueDate: 1 })
      .populate('vaccineType', 'name disease')
      .populate('patient', 'name phone');

    res.status(200).json({ success: true, count: upcoming.length, upcoming });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/immunizations/patient/:patientId
// @access  doctor or admin only
exports.getPatientImmunizations = async (req, res) => {
  try {
    const immunizations = await Immunization.find({ patient: req.params.patientId })
      .sort({ administeredAt: -1 })
      .populate('vaccineType', 'name disease description intervalDays')
      .populate('administeredBy', 'name');

    res.status(200).json({ success: true, count: immunizations.length, immunizations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Step 5 — Routes

### `routes/vaccineTypeRoutes.js`
```js
const express = require('express');
const router = express.Router();
const {
  createVaccineType,
  getVaccineTypes,
  updateVaccineType,
  deactivateVaccineType,
} = require('../controllers/vaccineTypeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('admin'), createVaccineType);
router.get('/', protect, getVaccineTypes);
router.put('/:id', protect, authorize('admin'), updateVaccineType);
router.patch('/:id/deactivate', protect, authorize('admin'), deactivateVaccineType);

module.exports = router;
```

### `routes/immunizationRoutes.js`
```js
const express = require('express');
const router = express.Router();
const {
  recordImmunization,
  getImmunizations,
  getUpcomingDue,
  getPatientImmunizations,
} = require('../controllers/immunizationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('doctor'), recordImmunization);
router.get('/', protect, getImmunizations);
router.get('/upcoming', protect, getUpcomingDue);
router.get('/patient/:patientId', protect, authorize('doctor', 'admin'), getPatientImmunizations);

module.exports = router;
```

---

## Step 6 — Register Routes in `server.js`

```js
app.use('/api/vaccine-types', require('./routes/vaccineTypeRoutes'));
app.use('/api/immunizations', require('./routes/immunizationRoutes'));
```

---

## Step 7 — Seed Vaccine Types (Run Once)

Create `backend/seed/vaccines.js` and run it once to populate your database:

```js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const VaccineType = require('../models/VaccineType');

const vaccines = [
  { name: 'BCG', disease: 'Tuberculosis', recommendedAgeMonths: 0, intervalDays: null },
  { name: 'Hepatitis B - Dose 1', disease: 'Hepatitis B', recommendedAgeMonths: 0, intervalDays: 30 },
  { name: 'Hepatitis B - Dose 2', disease: 'Hepatitis B', recommendedAgeMonths: 1, intervalDays: 60 },
  { name: 'Hepatitis B - Dose 3', disease: 'Hepatitis B', recommendedAgeMonths: 6, intervalDays: null },
  { name: 'OPV - Dose 1', disease: 'Polio', recommendedAgeMonths: 2, intervalDays: 60 },
  { name: 'OPV - Dose 2', disease: 'Polio', recommendedAgeMonths: 4, intervalDays: 60 },
  { name: 'OPV - Dose 3', disease: 'Polio', recommendedAgeMonths: 6, intervalDays: null },
  { name: 'DPT - Dose 1', disease: 'Diphtheria, Pertussis, Tetanus', recommendedAgeMonths: 6, intervalDays: 60 },
  { name: 'DPT - Dose 2', disease: 'Diphtheria, Pertussis, Tetanus', recommendedAgeMonths: 10, intervalDays: 60 },
  { name: 'DPT - Dose 3', disease: 'Diphtheria, Pertussis, Tetanus', recommendedAgeMonths: 14, intervalDays: null },
  { name: 'MMR', disease: 'Measles, Mumps, Rubella', recommendedAgeMonths: 12, intervalDays: null },
  { name: 'Typhoid', disease: 'Typhoid', recommendedAgeMonths: 24, intervalDays: 1095 }, // booster every 3 years
  { name: 'COVID-19 - Primary', disease: 'COVID-19', recommendedAgeMonths: null, intervalDays: 84 },
  { name: 'COVID-19 - Booster', disease: 'COVID-19', recommendedAgeMonths: null, intervalDays: null },
  { name: 'Influenza (Annual)', disease: 'Influenza', recommendedAgeMonths: null, intervalDays: 365 },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await VaccineType.deleteMany();
  await VaccineType.insertMany(vaccines);
  console.log(`Seeded ${vaccines.length} vaccine types`);
  process.exit();
};

seed();
```

Run it:
```bash
cd backend
node seed/vaccines.js
```

---

## Step 8 — Add Immunization Form (`components/AddImmunizationForm.jsx`)

```jsx
import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function AddImmunizationForm({ patients, onSuccess }) {
  const [vaccines, setVaccines] = useState([]);
  const [form, setForm] = useState({
    patientId: '',
    vaccineTypeId: '',
    administeredAt: new Date().toISOString().split('T')[0],
    batchNumber: '',
    facilityName: '',
    sideEffects: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVaccines = async () => {
      try {
        const { data } = await API.get('/vaccine-types');
        setVaccines(data.vaccines);
      } catch {
        setError('Could not load vaccine types');
      }
    };
    fetchVaccines();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await API.post('/immunizations', {
        patientId: form.patientId,
        vaccineTypeId: form.vaccineTypeId,
        administeredAt: form.administeredAt,
        batchNumber: form.batchNumber || null,
        facility: { name: form.facilityName },
        sideEffects: form.sideEffects || null,
        notes: form.notes || null,
      });
      onSuccess();
      setForm({
        patientId: '',
        vaccineTypeId: '',
        administeredAt: new Date().toISOString().split('T')[0],
        batchNumber: '',
        facilityName: '',
        sideEffects: '',
        notes: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record immunization');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { display: 'block', width: '100%', marginBottom: 8, padding: 8 };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 16, border: '1px solid #eee', borderRadius: 8, marginBottom: 24 }}>
      <h3>Record Immunization</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <select value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} required style={inputStyle}>
        <option value="">Select Patient</option>
        {patients.map(p => (
          <option key={p._id} value={p._id}>{p.name} — {p.phone}</option>
        ))}
      </select>

      <select value={form.vaccineTypeId} onChange={e => setForm({ ...form, vaccineTypeId: e.target.value })} required style={inputStyle}>
        <option value="">Select Vaccine</option>
        {vaccines.map(v => (
          <option key={v._id} value={v._id}>{v.name} ({v.disease})</option>
        ))}
      </select>

      <label style={{ fontSize: 13, color: '#666' }}>Date Administered</label>
      <input type="date" value={form.administeredAt} onChange={e => setForm({ ...form, administeredAt: e.target.value })} required style={inputStyle} />

      <input placeholder="Batch number (optional)" value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} style={inputStyle} />
      <input placeholder="Facility name" value={form.facilityName} onChange={e => setForm({ ...form, facilityName: e.target.value })} style={inputStyle} />
      <input placeholder="Side effects observed (optional)" value={form.sideEffects} onChange={e => setForm({ ...form, sideEffects: e.target.value })} style={inputStyle} />
      <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={inputStyle} />

      <button type="submit" disabled={loading} style={{ padding: '8px 20px' }}>
        {loading ? 'Saving...' : 'Record Vaccine'}
      </button>
    </form>
  );
}
```

---

## Step 9 — Immunization Card (`components/ImmunizationCard.jsx`)

```jsx
export default function ImmunizationCard({ record, showPatient = false }) {
  const isOverdue = record.nextDueDate && new Date(record.nextDueDate) < new Date();
  const isDueSoon =
    record.nextDueDate &&
    !isOverdue &&
    new Date(record.nextDueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div style={{
      border: `1px solid ${isOverdue ? '#f5c6cb' : isDueSoon ? '#ffeeba' : '#ddd'}`,
      background: isOverdue ? '#fff5f5' : isDueSoon ? '#fffdf0' : '#fff',
      borderRadius: 8,
      padding: 14,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <strong>{record.vaccineType?.name}</strong>
          <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>
            {record.vaccineType?.disease}
          </span>
        </div>
        {isOverdue && (
          <span style={{ fontSize: 11, background: '#f8d7da', color: '#721c24', padding: '2px 8px', borderRadius: 10 }}>
            OVERDUE
          </span>
        )}
        {isDueSoon && (
          <span style={{ fontSize: 11, background: '#fff3cd', color: '#856404', padding: '2px 8px', borderRadius: 10 }}>
            DUE SOON
          </span>
        )}
      </div>

      {showPatient && record.patient && (
        <p style={{ fontSize: 13, color: '#555', margin: '4px 0' }}>
          Patient: {record.patient.name} ({record.patient.phone})
        </p>
      )}

      <p style={{ fontSize: 13, color: '#555', margin: '6px 0 2px' }}>
        Given on: <strong>{new Date(record.administeredAt).toDateString()}</strong>
        {record.administeredBy && ` by Dr. ${record.administeredBy.name}`}
      </p>

      {record.nextDueDate && (
        <p style={{ fontSize: 13, color: isOverdue ? '#721c24' : isDueSoon ? '#856404' : '#155724', margin: '2px 0' }}>
          Next dose due: <strong>{new Date(record.nextDueDate).toDateString()}</strong>
        </p>
      )}

      {record.batchNumber && (
        <p style={{ fontSize: 12, color: '#888', margin: '2px 0' }}>Batch: {record.batchNumber}</p>
      )}

      {record.facility?.name && (
        <p style={{ fontSize: 12, color: '#888', margin: '2px 0' }}>Facility: {record.facility.name}</p>
      )}

      {record.sideEffects && (
        <p style={{ fontSize: 13, color: '#856404', margin: '4px 0' }}>
          Side effects: {record.sideEffects}
        </p>
      )}
    </div>
  );
}
```

---

## Step 10 — Immunizations Page (`pages/Immunizations.jsx`)

```jsx
import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AddImmunizationForm from '../components/AddImmunizationForm';
import ImmunizationCard from '../components/ImmunizationCard';

export default function Immunizations() {
  const { user } = useAuth();
  const [immunizations, setImmunizations] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('history'); // 'history' | 'upcoming'

  const fetchData = async () => {
    try {
      const [immuRes, upcomingRes] = await Promise.all([
        API.get('/immunizations'),
        API.get('/immunizations/upcoming'),
      ]);
      setImmunizations(immuRes.data.immunizations);
      setUpcoming(upcomingRes.data.upcoming);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data } = await API.get('/patients/my-patients');
      setPatients(data.patients);
    } catch {
      setPatients([]);
    }
  };

  useEffect(() => {
    fetchData();
    if (user?.role === 'doctor') fetchPatients();
  }, []);

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
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <h2>Immunization Records</h2>

      {user?.role === 'doctor' && (
        <AddImmunizationForm patients={patients} onSuccess={fetchData} />
      )}

      {/* Upcoming alert banner */}
      {upcoming.length > 0 && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeeba',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}>
          <strong>⚠ {upcoming.length} vaccine(s) due in the next 30 days</strong>
          <button
            onClick={() => setTab('upcoming')}
            style={{ marginLeft: 12, fontSize: 12, padding: '2px 10px', cursor: 'pointer' }}
          >
            View
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: 16 }}>
        <button style={tabStyle('history')} onClick={() => setTab('history')}>
          History ({immunizations.length})
        </button>
        <button style={tabStyle('upcoming')} onClick={() => setTab('upcoming')}>
          Upcoming Due ({upcoming.length})
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : tab === 'history' ? (
        immunizations.length === 0 ? (
          <p>No immunization records found.</p>
        ) : (
          immunizations.map((r) => (
            <ImmunizationCard
              key={r._id}
              record={r}
              showPatient={user?.role !== 'patient'}
            />
          ))
        )
      ) : (
        upcoming.length === 0 ? (
          <p>No vaccines due in the next 30 days.</p>
        ) : (
          upcoming.map((r) => (
            <ImmunizationCard
              key={r._id}
              record={r}
              showPatient={user?.role !== 'patient'}
            />
          ))
        )
      )}
    </div>
  );
}
```

---

## Step 11 — Update `App.jsx` and Dashboard

Add route in `App.jsx`:
```jsx
import Immunizations from './pages/Immunizations';

// Inside <Routes>:
<Route path="/immunizations" element={<ProtectedRoute><Immunizations /></ProtectedRoute>} />
```

Add link in `Dashboard.jsx`:
```jsx
<Link to="/immunizations"><button>Immunizations</button></Link>
```

---

## Test Your Phase 4

### 1. Seed the database first
```bash
node seed/vaccines.js
```
Expected: "Seeded 15 vaccine types"

### 2. Get all vaccine types
```
GET http://localhost:5000/api/vaccine-types
```
Expected: 15 active vaccines listed

### 3. Record an immunization (as doctor)
```
POST http://localhost:5000/api/immunizations
Body:
{
  "patientId": "<patientUserId>",
  "vaccineTypeId": "<hepatitisB_dose1_id>",
  "administeredAt": "2025-11-01",
  "batchNumber": "HB-2025-001",
  "facility": { "name": "Government Medical College, Ernakulam" }
}
```
Expected: 201, nextDueDate auto-calculated as 30 days later (Dec 1, 2025)

### 4. Try duplicate recording (should fail)
Same request again.
Expected: 400 — "This vaccine is already recorded for this patient on this date"

### 5. Get immunizations (as patient)
```
GET http://localhost:5000/api/immunizations
```
Expected: Only own records

### 6. Get upcoming due
```
GET http://localhost:5000/api/immunizations/upcoming
```
Expected: Records where nextDueDate is within 30 days

### 7. Try patient recording (should fail)
```
POST http://localhost:5000/api/immunizations
```
Expected: 403 Forbidden — only doctors can record

---

## Phase 4 Checklist

- [ ] Vaccine seed script runs without error — 15 vaccines in DB
- [ ] Vaccine types API returns only active vaccines
- [ ] Doctor can record immunization for an assigned patient
- [ ] `nextDueDate` auto-calculated from `intervalDays` (e.g. Hep B Dose 1 → 30 days later)
- [ ] Duplicate vaccine+patient+date rejected with clear error
- [ ] Patient sees only their own immunizations
- [ ] Upcoming due API returns vaccines due within 30 days
- [ ] Frontend shows OVERDUE badge if nextDueDate has passed
- [ ] Frontend shows DUE SOON badge if nextDueDate is within 7 days
- [ ] Yellow alert banner appears on page if upcoming vaccines exist
- [ ] Patient cannot access the add immunization form

---

## What's Next — Phase 5

You will build:
- Doctor portal — full view of all assigned patients
- Per-patient detail page with health records + immunizations combined
- Doctor can add health records directly from patient detail page
- Quick stats for doctor (total patients, pending appointments, upcoming vaccines)

---

## Key Decisions to Remember for Interview

| Decision | Why |
|----------|-----|
| Two models: VaccineType + Immunization | Master-detail pattern — changes to vaccine info don't corrupt historical records |
| `nextDueDate` stored not computed | Storing pre-computed date enables a simple `$lte` query for upcoming vaccines; computing on the fly would require fetching all records and filtering in code |
| Unique index on patient+vaccine+date | Database-level duplicate prevention is safer than application-level checks alone |
| `isActive` soft delete on VaccineType | Existing Immunization records reference VaccineType by ObjectId — hard delete would orphan those references |
| Seeding via script | Reproducible data setup — anyone cloning the repo can run one command to get a working database |
| `Promise.all` for parallel fetches | Fetching immunization history and upcoming due simultaneously instead of sequentially — cuts page load time roughly in half |