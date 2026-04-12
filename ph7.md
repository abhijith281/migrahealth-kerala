# SIH25083 — MigraHealth Kerala
## Phase 7: Admin Dashboard

> **What you build in this phase:**
> A full admin control panel — manage all users, assign doctors to patients,
> view system-wide stats, and a simple analytics chart (records per month).
> By the end, the admin can run the entire system from one dashboard.

---

## What the Admin Sees (Understand before coding)

```
Admin Dashboard
├── Stats row: Total users | Total patients | Total doctors | Total records | Total appointments
├── Analytics: Health records created per month (bar chart — no library needed)
├── Users tab
│   ├── All users list with role badges
│   ├── Search by name / phone
│   └── Change user role (patient → doctor, etc.)
├── Patients tab
│   ├── All patients with assigned doctor shown
│   └── Assign / reassign doctor dropdown per patient
└── Doctors tab
    ├── All doctors with patient count
    └── View doctor's patient list
```

No new models needed. All data comes from existing models.

---

## New Files to Create

```
backend/
├── controllers/
│   └── adminController.js      ← NEW
├── routes/
│   └── adminRoutes.js          ← NEW

frontend/src/
├── pages/
│   └── AdminDashboard.jsx      ← NEW
├── components/
│   ├── AdminUserRow.jsx        ← NEW
│   ├── AdminPatientRow.jsx     ← NEW
│   └── MiniBarChart.jsx        ← NEW
```

---

## Step 1 — Admin Controller (`controllers/adminController.js`)

```js
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const HealthRecord = require('../models/HealthRecord');
const Appointment = require('../models/Appointment');
const Immunization = require('../models/Immunization');

// @route   GET /api/admin/stats
// @access  admin only
exports.getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalRecords,
      totalAppointments,
      totalImmunizations,
      pendingAppointments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      HealthRecord.countDocuments(),
      Appointment.countDocuments(),
      Immunization.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPatients,
        totalDoctors,
        totalRecords,
        totalAppointments,
        totalImmunizations,
        pendingAppointments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/admin/analytics/records-per-month
// @access  admin only
exports.getRecordsPerMonth = async (req, res) => {
  try {
    // Get last 6 months of health record creation data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const result = await HealthRecord.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format into readable labels
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const formatted = result.map((r) => ({
      label: `${monthNames[r._id.month - 1]} ${r._id.year}`,
      count: r.count,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/admin/users
// @access  admin only
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    let query = {};
    if (role && role !== 'all') query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PATCH /api/admin/users/:id/role
// @access  admin only
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['patient', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Prevent admin from changing their own role
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If promoted to doctor, create DoctorProfile if not exists
    if (role === 'doctor') {
      await DoctorProfile.findOneAndUpdate(
        { user: user._id },
        { user: user._id },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/admin/patients
// @access  admin only
// Returns all patients with their profile + assigned doctor info
exports.getAllPatients = async (req, res) => {
  try {
    const profiles = await PatientProfile.find()
      .populate('user', 'name phone language homeState createdAt')
      .populate('assignedDoctor', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: profiles.length, patients: profiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PATCH /api/admin/patients/:patientId/assign-doctor
// @access  admin only
exports.assignDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;
    const { patientId } = req.params;

    // Validate doctor exists and has doctor role
    if (doctorId) {
      const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found or user is not a doctor',
        });
      }

      // Add patient to doctor's patients array (avoid duplicates)
      await DoctorProfile.findOneAndUpdate(
        { user: doctorId },
        { $addToSet: { patients: patientId } },
        { upsert: true }
      );
    }

    // Remove patient from old doctor's list if they had one
    const oldProfile = await PatientProfile.findOne({ user: patientId });
    if (oldProfile?.assignedDoctor && oldProfile.assignedDoctor.toString() !== doctorId) {
      await DoctorProfile.findOneAndUpdate(
        { user: oldProfile.assignedDoctor },
        { $pull: { patients: patientId } }
      );
    }

    // Update patient profile
    const profile = await PatientProfile.findOneAndUpdate(
      { user: patientId },
      { assignedDoctor: doctorId || null },
      { new: true, upsert: true }
    )
      .populate('user', 'name phone')
      .populate('assignedDoctor', 'name phone');

    res.status(200).json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/admin/doctors
// @access  admin only
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await DoctorProfile.find()
      .populate('user', 'name phone createdAt')
      .populate('patients', 'name phone');

    // Add patient count to each doctor
    const formatted = doctors.map((d) => ({
      ...d.toObject(),
      patientCount: d.patients.length,
    }));

    res.status(200).json({ success: true, count: formatted.length, doctors: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/admin/users/:id
// @access  admin only — soft approach: deactivate rather than delete
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Step 2 — Admin Routes (`routes/adminRoutes.js`)

```js
const express = require('express');
const router = express.Router();
const {
  getSystemStats,
  getRecordsPerMonth,
  getAllUsers,
  changeUserRole,
  getAllPatients,
  assignDoctor,
  getAllDoctors,
  deleteUser,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require admin role
router.use(protect, authorize('admin'));

router.get('/stats', getSystemStats);
router.get('/analytics/records-per-month', getRecordsPerMonth);
router.get('/users', getAllUsers);
router.patch('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);
router.get('/patients', getAllPatients);
router.patch('/patients/:patientId/assign-doctor', assignDoctor);
router.get('/doctors', getAllDoctors);

module.exports = router;
```

---

## Step 3 — Register in `server.js`

```js
app.use('/api/admin', require('./routes/adminRoutes'));
```

---

## Step 4 — Mini Bar Chart (`components/MiniBarChart.jsx`)

No external library — pure CSS bars.

```jsx
export default function MiniBarChart({ data, title }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{
      border: '1px solid #e9ecef',
      borderRadius: 10,
      padding: '16px 20px',
      marginBottom: 24,
    }}>
      <h4 style={{ margin: '0 0 16px', fontSize: 14, color: '#495057' }}>{title}</h4>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
        {data.map((d) => {
          const heightPct = Math.max((d.count / max) * 100, 4);
          return (
            <div
              key={d.label}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              {/* Count label on top */}
              <span style={{ fontSize: 11, color: '#495057', fontWeight: 500 }}>
                {d.count}
              </span>
              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  background: '#343a40',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 4,
                }}
              />
              {/* Month label */}
              <span style={{ fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 1.2 }}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Step 5 — Admin User Row (`components/AdminUserRow.jsx`)

```jsx
import { useState } from 'react';
import API from '../api/axios';

const roleColors = {
  patient: { bg: '#d1ecf1', color: '#0c5460' },
  doctor: { bg: '#d4edda', color: '#155724' },
  admin: { bg: '#f8d7da', color: '#721c24' },
};

export default function AdminUserRow({ user, onRefresh }) {
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRoleChange = async (newRole) => {
    if (!window.confirm(`Change ${user.name}'s role to ${newRole}?`)) return;
    setChanging(true);
    try {
      await API.patch(`/admin/users/${user._id}/role`, { role: newRole });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change role');
    } finally {
      setChanging(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await API.delete(`/admin/users/${user._id}`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const rc = roleColors[user.role];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      border: '1px solid #e9ecef',
      borderRadius: 8,
      marginBottom: 8,
      background: '#fff',
      flexWrap: 'wrap',
    }}>
      {/* Name + phone */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{user.name}</div>
        <div style={{ fontSize: 12, color: '#888' }}>
          {user.phone}
          {user.homeState && ` · ${user.homeState}`}
        </div>
        <div style={{ fontSize: 11, color: '#aaa' }}>
          Joined {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Role badge */}
      <span style={{
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 10,
        background: rc.bg,
        color: rc.color,
        fontWeight: 500,
        flexShrink: 0,
      }}>
        {user.role.toUpperCase()}
      </span>

      {/* Role change select */}
      <select
        defaultValue=""
        onChange={e => { if (e.target.value) handleRoleChange(e.target.value); }}
        disabled={changing}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid #ddd',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <option value="" disabled>Change role</option>
        {['patient', 'doctor', 'admin']
          .filter(r => r !== user.role)
          .map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
      </select>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          padding: '4px 10px',
          fontSize: 12,
          background: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: 6,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {deleting ? '...' : 'Delete'}
      </button>
    </div>
  );
}
```

---

## Step 6 — Admin Patient Row (`components/AdminPatientRow.jsx`)

```jsx
import { useState } from 'react';
import API from '../api/axios';

export default function AdminPatientRow({ patient, doctors, onRefresh }) {
  const [assigning, setAssigning] = useState(false);
  const user = patient.user;

  const handleAssign = async (doctorId) => {
    setAssigning(true);
    try {
      await API.patch(`/admin/patients/${user._id}/assign-doctor`, {
        doctorId: doctorId || null,
      });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign doctor');
    } finally {
      setAssigning(false);
    }
  };

  const languageLabels = {
    ml: 'ML', hi: 'HI', bn: 'BN', ta: 'TA', or: 'OR', en: 'EN',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      border: '1px solid #e9ecef',
      borderRadius: 8,
      marginBottom: 8,
      background: '#fff',
      flexWrap: 'wrap',
    }}>
      {/* Patient info */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{user?.name}</div>
        <div style={{ fontSize: 12, color: '#888' }}>
          {user?.phone}
          {user?.homeState && ` · ${user.homeState}`}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
            <span style={{ fontSize: 10, background: '#f8d7da', color: '#721c24', padding: '1px 6px', borderRadius: 8 }}>
              {patient.bloodGroup}
            </span>
          )}
          {user?.language && (
            <span style={{ fontSize: 10, background: '#e2d9f3', color: '#4a235a', padding: '1px 6px', borderRadius: 8 }}>
              {languageLabels[user.language]}
            </span>
          )}
        </div>
      </div>

      {/* Current doctor */}
      <div style={{ fontSize: 13, color: patient.assignedDoctor ? '#155724' : '#888', flexShrink: 0 }}>
        {patient.assignedDoctor
          ? `Dr. ${patient.assignedDoctor.name}`
          : 'No doctor assigned'}
      </div>

      {/* Doctor assignment dropdown */}
      <select
        value={patient.assignedDoctor?._id || ''}
        onChange={e => handleAssign(e.target.value)}
        disabled={assigning}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid #ddd',
          fontSize: 12,
          cursor: 'pointer',
          maxWidth: 180,
        }}
      >
        <option value="">-- Unassign --</option>
        {doctors.map(d => (
          <option key={d._id} value={d._id}>
            Dr. {d.name} ({d.phone})
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## Step 7 — Admin Dashboard Page (`pages/AdminDashboard.jsx`)

```jsx
import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import MiniBarChart from '../components/MiniBarChart';
import AdminUserRow from '../components/AdminUserRow';
import AdminPatientRow from '../components/AdminPatientRow';

const tabs = ['overview', 'users', 'patients', 'doctors'];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorUsers, setDoctorUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Fetch stats + chart on mount
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [statsRes, chartRes] = await Promise.all([
          API.get('/admin/stats'),
          API.get('/admin/analytics/records-per-month'),
        ]);
        setStats(statsRes.data.stats);
        setChartData(chartRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOverview();
  }, []);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'patients') fetchPatients();
    if (tab === 'doctors') fetchDoctors();
  }, [tab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/users');
      setUsers(data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const [patientsRes, doctorUsersRes] = await Promise.all([
        API.get('/admin/patients'),
        API.get('/admin/users?role=doctor'),
      ]);
      setPatients(patientsRes.data.patients);
      setDoctorUsers(doctorUsersRes.data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/doctors');
      setDoctors(data.doctors);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Client-side filter for users
  const filteredUsers = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.phone.includes(q);
    return matchRole && matchSearch;
  });

  const filteredPatients = patients.filter(p => {
    const q = search.toLowerCase();
    return !q ||
      p.user?.name?.toLowerCase().includes(q) ||
      p.user?.phone?.includes(q) ||
      p.user?.homeState?.toLowerCase().includes(q);
  });

  const tabStyle = (t) => ({
    padding: '7px 18px',
    borderRadius: 20,
    border: '1px solid #ddd',
    background: tab === t ? '#343a40' : 'transparent',
    color: tab === t ? '#fff' : '#333',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: tab === t ? 500 : 400,
  });

  return (
    <div style={{ maxWidth: 820, margin: '40px auto', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Panel</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>{user?.name}</p>
        </div>
        <button onClick={logout} style={{ padding: '6px 14px' }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => { setTab(t); setSearch(''); setRoleFilter('all'); }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <>
          {stats ? (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                <StatsCard label="Total Users" value={stats.totalUsers} />
                <StatsCard label="Patients" value={stats.totalPatients} color="#0c5460" />
                <StatsCard label="Doctors" value={stats.totalDoctors} color="#155724" />
                <StatsCard label="Health Records" value={stats.totalRecords} />
                <StatsCard label="Appointments" value={stats.totalAppointments} />
                <StatsCard
                  label="Pending Appts"
                  value={stats.pendingAppointments}
                  color={stats.pendingAppointments > 0 ? '#856404' : '#343a40'}
                />
                <StatsCard label="Immunizations" value={stats.totalImmunizations} />
              </div>
              <MiniBarChart
                data={chartData}
                title="Health Records Created — Last 6 Months"
              />
            </>
          ) : (
            <p>Loading stats...</p>
          )}
        </>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input
              placeholder="Search name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
            />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
            >
              <option value="all">All roles</option>
              <option value="patient">Patients</option>
              <option value="doctor">Doctors</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
            Showing {filteredUsers.length} of {users.length} users
          </p>

          {loading ? (
            <p>Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p style={{ color: '#888' }}>No users found.</p>
          ) : (
            filteredUsers.map(u => (
              <AdminUserRow key={u._id} user={u} onRefresh={fetchUsers} />
            ))
          )}
        </>
      )}

      {/* PATIENTS TAB */}
      {tab === 'patients' && (
        <>
          <input
            placeholder="Search patient by name, phone, or state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '7px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 14 }}
          />

          <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
            {filteredPatients.length} patients
            {' · '}
            {patients.filter(p => !p.assignedDoctor).length} unassigned
          </p>

          {loading ? (
            <p>Loading patients...</p>
          ) : filteredPatients.length === 0 ? (
            <p style={{ color: '#888' }}>No patients found.</p>
          ) : (
            filteredPatients.map(p => (
              <AdminPatientRow
                key={p._id}
                patient={p}
                doctors={doctorUsers}
                onRefresh={fetchPatients}
              />
            ))
          )}
        </>
      )}

      {/* DOCTORS TAB */}
      {tab === 'doctors' && (
        <>
          {loading ? (
            <p>Loading doctors...</p>
          ) : doctors.length === 0 ? (
            <p style={{ color: '#888' }}>No doctors found. Promote a user to doctor role in the Users tab.</p>
          ) : (
            doctors.map(d => (
              <div key={d._id} style={{
                padding: '14px 16px',
                border: '1px solid #e9ecef',
                borderRadius: 8,
                marginBottom: 10,
                background: '#fff',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>Dr. {d.user?.name}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                      {d.user?.phone}
                      {d.specialization && ` · ${d.specialization}`}
                      {d.hospital?.district && ` · ${d.hospital.district}`}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12,
                    background: '#d4edda',
                    color: '#155724',
                    padding: '3px 10px',
                    borderRadius: 10,
                    fontWeight: 500,
                  }}>
                    {d.patientCount} patient{d.patientCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {d.patients?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Assigned patients:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {d.patients.map(p => (
                        <span key={p._id} style={{
                          fontSize: 12,
                          background: '#f1f3f5',
                          padding: '2px 8px',
                          borderRadius: 8,
                          color: '#495057',
                        }}>
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
```

---

## Step 8 — Update `App.jsx`

```jsx
import AdminDashboard from './pages/AdminDashboard';

// Inside <Routes>:
<Route
  path="/admin"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

Update `Login.jsx` to redirect admin to `/admin`:

```jsx
const user = await login(form.phone, form.password);
if (user.role === 'admin') navigate('/admin');
else if (user.role === 'doctor') navigate('/doctor');
else navigate('/dashboard');
```

---

## Step 9 — Create First Admin User

MongoDB Atlas — manually update one user's role:

Go to your `users` collection → find your user → Edit:
```json
{ "role": "admin" }
```

Then log in with that user. You now have admin access.

---

## Test Your Phase 7

### 1. Get system stats
```
GET http://localhost:5000/api/admin/stats
(logged in as admin)
```
Expected: All 7 stat fields returned

### 2. Get records per month
```
GET http://localhost:5000/api/admin/analytics/records-per-month
```
Expected: Array of { label: "Nov 2025", count: 3 } for last 6 months

### 3. Get all users with search
```
GET http://localhost:5000/api/admin/users?search=raju
```
Expected: Users matching "raju" in name or phone

### 4. Change user role
```
PATCH http://localhost:5000/api/admin/users/<userId>/role
Body: { "role": "doctor" }
```
Expected: User role updated, DoctorProfile auto-created

### 5. Try changing own role (should fail)
```
PATCH http://localhost:5000/api/admin/users/<yourOwnId>/role
Body: { "role": "patient" }
```
Expected: 400 — "You cannot change your own role"

### 6. Assign doctor to patient
```
PATCH http://localhost:5000/api/admin/patients/<patientUserId>/assign-doctor
Body: { "doctorId": "<doctorUserId>" }
```
Expected: PatientProfile updated, DoctorProfile.patients array updated

### 7. Unassign doctor
```
PATCH http://localhost:5000/api/admin/patients/<patientUserId>/assign-doctor
Body: { "doctorId": "" }
```
Expected: assignedDoctor set to null

### 8. Get all doctors with patient list
```
GET http://localhost:5000/api/admin/doctors
```
Expected: Doctors with their patients array + patientCount

---

## Phase 7 Checklist

- [ ] System stats returns all 7 fields correctly
- [ ] Records-per-month aggregation returns data (add a few test records first)
- [ ] Bar chart renders with correct heights relative to max value
- [ ] Users tab: search filters client-side by name and phone
- [ ] Users tab: role filter dropdown works
- [ ] Role change works — doctor role auto-creates DoctorProfile
- [ ] Admin cannot change their own role
- [ ] Patients tab shows unassigned count
- [ ] Doctor assignment updates both PatientProfile and DoctorProfile
- [ ] Reassigning doctor removes patient from old doctor's list
- [ ] Doctors tab shows patient count badge per doctor
- [ ] Admin login redirects to `/admin`
- [ ] Non-admin trying to access `/api/admin/*` gets 403

---

## What's Next — Phase 8 (Final)

You will build:
- Deploy backend to **Render** (free tier)
- Deploy frontend to **Vercel** (free tier)
- Connect to MongoDB Atlas (already set up)
- Environment variables in deployment
- Final README.md for the project

After Phase 8 your project is **fully deployed and demo-ready**.

---

## Key Decisions to Remember for Interview

| Decision | Why |
|----------|-----|
| MongoDB aggregation for analytics | `$group` + `$match` runs the calculation in the database, not in Node — more efficient than fetching all records and counting in JS |
| Pure CSS bar chart, no library | No Chart.js or Recharts needed for a simple bar chart — shows you can build without reaching for a library every time |
| `$addToSet` for doctor's patients array | Prevents duplicate patient entries in the array — MongoDB operator handles deduplication atomically |
| `$pull` when reassigning doctor | When a patient is reassigned, the old doctor's patients array is cleaned up — data stays consistent across both models |
| `router.use(protect, authorize('admin'))` | Single line protects all 8 admin routes — cleaner and safer than adding middleware to each route individually |
| Role change auto-creates DoctorProfile | Admin shouldn't have to manually create a DoctorProfile after promoting a user — the system handles it automatically |
| Cannot delete/change own account | Prevents admin from accidentally locking themselves out of the system |
| Client-side filtering for users/patients | Admin's dataset is small enough — avoids extra API calls on every keystroke |
