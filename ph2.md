# SIH25083 — MigraHealth Kerala
## Phase 2: Patient Profile + Health Records CRUD

> **What you build in this phase:**
> Patient profile schema, health record schema, doctor schema,
> and full CRUD APIs for health records.
> By the end, a logged-in patient can create, view, update their health records.
> A doctor can view records of assigned patients.

---

## New Files to Create

```
backend/
├── models/
│   ├── User.js          ← already exists
│   ├── PatientProfile.js  ← NEW
│   ├── HealthRecord.js    ← NEW
│   └── DoctorProfile.js   ← NEW
├── controllers/
│   ├── authController.js  ← already exists
│   ├── patientController.js  ← NEW
│   └── healthRecordController.js  ← NEW
├── routes/
│   ├── authRoutes.js      ← already exists
│   ├── patientRoutes.js   ← NEW
│   └── healthRecordRoutes.js  ← NEW

frontend/src/
├── pages/
│   ├── Dashboard.jsx         ← NEW
│   └── HealthRecords.jsx     ← NEW
├── components/
│   └── HealthRecordForm.jsx  ← NEW
├── api/
│   └── axios.js              ← already exists
```

---

## Step 1 — Patient Profile Model (`models/PatientProfile.js`)

```js
const mongoose = require('mongoose');

const patientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one profile per user
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    allergies: [
      {
        type: String,
        trim: true,
        // e.g. ["Penicillin", "Peanuts", "Dust"]
      },
    ],
    chronicConditions: [
      {
        type: String,
        trim: true,
        // e.g. ["Diabetes Type 2", "Hypertension"]
      },
    ],
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    currentAddress: {
      // Where they are currently living in Kerala
      district: { type: String },
      city: { type: String },
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // ref to User with role 'doctor'
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PatientProfile', patientProfileSchema);
```

### Why this schema? (Interview Answer)
- **Separate from User model** — User handles auth, PatientProfile handles medical data. Single Responsibility Principle. Makes it easier to delete medical data without deleting the account.
- **allergies as array of strings** — simple and sufficient for this scope. Production would use a medical coding system like SNOMED.
- **assignedDoctor as ObjectId ref** — creates a relationship between patient and doctor, enables doctor to pull their patient list with one query.

---

## Step 2 — Health Record Model (`models/HealthRecord.js`)

```js
const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // can be null if patient self-reports
    },
    recordType: {
      type: String,
      enum: [
        'consultation',
        'prescription',
        'lab_result',
        'immunization',
        'hospitalization',
        'self_report',
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Record title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    medications: [
      {
        name: { type: String },
        dosage: { type: String },   // e.g. "500mg"
        frequency: { type: String }, // e.g. "twice daily"
        duration: { type: String },  // e.g. "7 days"
      },
    ],
    visitDate: {
      type: Date,
      default: Date.now,
    },
    facility: {
      // Hospital or clinic name
      name: { type: String },
      location: { type: String },
    },
    isVerified: {
      type: Boolean,
      default: false,
      // true only if a doctor added/confirmed this record
    },
  },
  { timestamps: true }
);

// Index for fast patient record lookup
healthRecordSchema.index({ patient: 1, visitDate: -1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
```

### Why this schema? (Interview Answer)
- **`recordType` enum** — controls what kind of data enters the system; prevents garbage data
- **`isVerified` flag** — distinguishes patient self-reports from doctor-confirmed records; critical for medical trust
- **Compound index on patient + visitDate** — most common query is "get all records for patient X sorted by date"; this index makes that fast
- **medications as array of objects** — each medication has its own dosage and frequency, which can't be captured in a flat string

---

## Step 3 — Doctor Profile Model (`models/DoctorProfile.js`)

```js
const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      // e.g. "General Physician", "Dermatologist"
    },
    licenseNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    hospital: {
      name: { type: String },
      district: { type: String },
    },
    patients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // List of patient userIds assigned to this doctor
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
```

---

## Step 4 — Patient Controller (`controllers/patientController.js`)

```js
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');

// @route   GET /api/patients/profile
// @access  patient only
exports.getMyProfile = async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ user: req.user.id })
      .populate('user', 'name phone language homeState')
      .populate('assignedDoctor', 'name phone');

    if (!profile) {
      // Auto-create empty profile on first access
      profile = await PatientProfile.create({ user: req.user.id });
    }

    res.status(200).json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/patients/profile
// @access  patient only
exports.updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      'bloodGroup',
      'dateOfBirth',
      'gender',
      'allergies',
      'chronicConditions',
      'emergencyContact',
      'currentAddress',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const profile = await PatientProfile.findOneAndUpdate(
      { user: req.user.id },
      updates,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/patients/my-patients
// @access  doctor only
exports.getMyPatients = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findOne({ user: req.user.id })
      .populate('patients', 'name phone language homeState');

    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    res.status(200).json({ success: true, patients: doctorProfile.patients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Step 5 — Health Record Controller (`controllers/healthRecordController.js`)

```js
const HealthRecord = require('../models/HealthRecord');
const PatientProfile = require('../models/PatientProfile');

// @route   POST /api/records
// @access  patient (self-report) or doctor
exports.createRecord = async (req, res) => {
  try {
    const { title, recordType, description, diagnosis, medications, visitDate, facility } = req.body;

    // If doctor is creating, they must provide patientId
    // If patient is creating, use their own id
    const patientId = req.user.role === 'doctor' ? req.body.patientId : req.user.id;
    const doctorId = req.user.role === 'doctor' ? req.user.id : null;
    const isVerified = req.user.role === 'doctor'; // auto-verify if doctor creates

    const record = await HealthRecord.create({
      patient: patientId,
      doctor: doctorId,
      title,
      recordType,
      description,
      diagnosis,
      medications,
      visitDate,
      facility,
      isVerified,
    });

    res.status(201).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/records
// @access  patient (own records) or doctor (assigned patients)
exports.getRecords = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patient') {
      query.patient = req.user.id;
    } else if (req.user.role === 'doctor') {
      // Doctor can only see records of their assigned patients
      const profile = await PatientProfile.find({ assignedDoctor: req.user.id });
      const patientIds = profile.map((p) => p.user);
      query.patient = { $in: patientIds };
    } else if (req.user.role === 'admin') {
      // Admin sees everything — no filter
    }

    const records = await HealthRecord.find(query)
      .sort({ visitDate: -1 })
      .populate('patient', 'name phone')
      .populate('doctor', 'name');

    res.status(200).json({ success: true, count: records.length, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/records/:id
// @access  patient (own) or doctor (assigned patient)
exports.getRecordById = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id)
      .populate('patient', 'name phone')
      .populate('doctor', 'name');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Authorization check
    if (
      req.user.role === 'patient' &&
      record.patient._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this record' });
    }

    res.status(200).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/records/:id
// @access  doctor only (patients cannot edit verified records)
exports.updateRecord = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Only the doctor who created it or admin can update
    if (
      req.user.role === 'doctor' &&
      record.doctor?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this record' });
    }

    const updated = await HealthRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, record: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/records/:id
// @access  admin only
exports.deleteRecord = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    await record.deleteOne();
    res.status(200).json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Step 6 — Routes

### `routes/patientRoutes.js`
```js
const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile, getMyPatients } = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/profile', protect, authorize('patient'), getMyProfile);
router.put('/profile', protect, authorize('patient'), updateMyProfile);
router.get('/my-patients', protect, authorize('doctor'), getMyPatients);

module.exports = router;
```

### `routes/healthRecordRoutes.js`
```js
const express = require('express');
const router = express.Router();
const {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
} = require('../controllers/healthRecordController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('patient', 'doctor'), createRecord);
router.get('/', protect, getRecords);
router.get('/:id', protect, getRecordById);
router.put('/:id', protect, authorize('doctor', 'admin'), updateRecord);
router.delete('/:id', protect, authorize('admin'), deleteRecord);

module.exports = router;
```

---

## Step 7 — Register New Routes in `server.js`

Add these two lines after your existing auth route:

```js
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/records', require('./routes/healthRecordRoutes'));
```

---

## Step 8 — Frontend: Dashboard Page (`pages/Dashboard.jsx`)

```jsx
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <h2>Welcome, {user?.name}</h2>
      <p>Role: <strong>{user?.role}</strong></p>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        {user?.role === 'patient' && (
          <>
            <Link to="/records"><button>My Health Records</button></Link>
            <Link to="/profile"><button>My Profile</button></Link>
          </>
        )}
        {user?.role === 'doctor' && (
          <Link to="/records"><button>Patient Records</button></Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/records"><button>All Records</button></Link>
        )}
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
```

---

## Step 9 — Health Record Form (`components/HealthRecordForm.jsx`)

```jsx
import { useState } from 'react';
import API from '../api/axios';

export default function HealthRecordForm({ onSuccess }) {
  const [form, setForm] = useState({
    title: '',
    recordType: 'self_report',
    description: '',
    diagnosis: '',
    visitDate: '',
    facility: { name: '', location: '' },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await API.post('/records', form);
      onSuccess();
      setForm({ title: '', recordType: 'self_report', description: '', diagnosis: '', visitDate: '', facility: { name: '', location: '' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <h3>Add Health Record</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <input
        placeholder="Title (e.g. Fever consultation)"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        required
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />

      <select
        value={form.recordType}
        onChange={e => setForm({ ...form, recordType: e.target.value })}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      >
        <option value="self_report">Self Report</option>
        <option value="consultation">Consultation</option>
        <option value="prescription">Prescription</option>
        <option value="lab_result">Lab Result</option>
        <option value="immunization">Immunization</option>
        <option value="hospitalization">Hospitalization</option>
      </select>

      <textarea
        placeholder="Description"
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
        rows={3}
      />

      <input
        placeholder="Diagnosis (if any)"
        value={form.diagnosis}
        onChange={e => setForm({ ...form, diagnosis: e.target.value })}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />

      <input
        type="date"
        value={form.visitDate}
        onChange={e => setForm({ ...form, visitDate: e.target.value })}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />

      <input
        placeholder="Hospital / Clinic name"
        value={form.facility.name}
        onChange={e => setForm({ ...form, facility: { ...form.facility, name: e.target.value } })}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />

      <button type="submit" disabled={loading} style={{ padding: '8px 20px' }}>
        {loading ? 'Saving...' : 'Add Record'}
      </button>
    </form>
  );
}
```

---

## Step 10 — Health Records Page (`pages/HealthRecords.jsx`)

```jsx
import { useEffect, useState } from 'react';
import API from '../api/axios';
import HealthRecordForm from '../components/HealthRecordForm';
import { useAuth } from '../context/AuthContext';

export default function HealthRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    try {
      const { data } = await API.get('/records');
      setRecords(data.records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <h2>Health Records</h2>

      {user?.role === 'patient' && (
        <HealthRecordForm onSuccess={fetchRecords} />
      )}

      {loading ? (
        <p>Loading records...</p>
      ) : records.length === 0 ? (
        <p>No records found.</p>
      ) : (
        records.map((r) => (
          <div key={r._id} style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 16,
            marginBottom: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{r.title}</strong>
              <span style={{
                fontSize: 12,
                background: r.isVerified ? '#d4edda' : '#fff3cd',
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {r.isVerified ? 'Verified' : 'Self-reported'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#666', margin: '4px 0' }}>
              {r.recordType} — {new Date(r.visitDate).toLocaleDateString()}
            </p>
            {r.description && <p style={{ fontSize: 14 }}>{r.description}</p>}
            {r.diagnosis && <p style={{ fontSize: 14 }}><strong>Diagnosis:</strong> {r.diagnosis}</p>}
            {r.facility?.name && <p style={{ fontSize: 13, color: '#888' }}>{r.facility.name}</p>}
          </div>
        ))
      )}
    </div>
  );
}
```

---

## Step 11 — Update App.jsx Routes

Add these new routes inside your `<Routes>`:

```jsx
import Dashboard from './pages/Dashboard';
import HealthRecords from './pages/HealthRecords';

// Inside <Routes>:
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/records" element={<ProtectedRoute><HealthRecords /></ProtectedRoute>} />
```

---

## Test Your Phase 2

### 1. Create a health record (as patient)
```
POST http://localhost:5000/api/records
Body:
{
  "title": "Fever and cold",
  "recordType": "self_report",
  "description": "Had fever for 2 days",
  "visitDate": "2025-08-01"
}
```
Expected: 201 with record, `isVerified: false`

### 2. Get all my records (as patient)
```
GET http://localhost:5000/api/records
```
Expected: Only your own records returned

### 3. Try to delete as patient (should fail)
```
DELETE http://localhost:5000/api/records/:id
```
Expected: 403 Forbidden

### 4. Update patient profile
```
PUT http://localhost:5000/api/patients/profile
Body:
{
  "bloodGroup": "B+",
  "allergies": ["Penicillin"],
  "chronicConditions": ["Diabetes Type 2"],
  "emergencyContact": { "name": "Ravi Das", "phone": "9876500000", "relation": "Brother" }
}
```
Expected: 200 with updated profile

---

## Phase 2 Checklist

- [ ] PatientProfile auto-created on first `/api/patients/profile` GET
- [ ] Health record created with `isVerified: false` when patient adds it
- [ ] Patient cannot see other patients' records
- [ ] Patient cannot delete records (403 returned)
- [ ] Doctor can see records of assigned patients only
- [ ] Frontend shows records list with verified/self-reported badge
- [ ] Add record form works and list refreshes after submission

---

## What's Next — Phase 3

You will build:
- Appointment booking (patient books with doctor)
- Appointment status flow: pending → confirmed → completed / cancelled
- Doctor can confirm or cancel appointments
- Frontend appointment booking form and list

---

## Key Decisions to Remember for Interview

| Decision | Why |
|----------|-----|
| PatientProfile separate from User | Single Responsibility — auth data and medical data have different lifecycles |
| `isVerified` flag on records | Differentiates trustworthy doctor records from patient self-reports — critical in medical context |
| Compound index on patient + visitDate | The most common query pattern — always index what you query most |
| Doctor sees only assigned patients | Data isolation — a doctor should never access records of patients they don't treat |
| `upsert: true` on profile update | Creates profile if it doesn't exist, updates if it does — one endpoint handles both cases cleanly |
| Admin-only delete | Medical records should never be deleted by patients or doctors — audit trail matters |
