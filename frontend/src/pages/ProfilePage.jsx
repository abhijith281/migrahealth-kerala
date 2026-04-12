import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, updateMyProfile } from '../utils/patientApi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const HOME_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const arrayToText = (arr) => (arr || []).join(', ');
const textToArray = (str) =>
  str.split(',').map((s) => s.trim()).filter(Boolean);

const ProfilePage = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    bloodGroup: 'Unknown',
    dateOfBirth: '',
    gender: '',
    allergiesText: '',
    chronicText: '',
    ecName: '',
    ecPhone: '',
    ecRelation: '',
    district: '',
    city: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMyProfile();
        const p = res.data.data;
        setProfile(p);
        setFormData({
          bloodGroup: p.bloodGroup || 'Unknown',
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
          gender: p.gender || '',
          allergiesText: arrayToText(p.allergies),
          chronicText: arrayToText(p.chronicConditions),
          ecName: p.emergencyContact?.name || '',
          ecPhone: p.emergencyContact?.phone || '',
          ecRelation: p.emergencyContact?.relation || '',
          district: p.currentAddress?.district || '',
          city: p.currentAddress?.city || '',
        });
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    setError('');
    setSuccess('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        bloodGroup: formData.bloodGroup,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        allergies: textToArray(formData.allergiesText),
        chronicConditions: textToArray(formData.chronicText),
        emergencyContact: {
          name: formData.ecName,
          phone: formData.ecPhone,
          relation: formData.ecRelation,
        },
        currentAddress: {
          district: formData.district,
          city: formData.city,
        },
      };
      const res = await updateMyProfile(payload);
      setProfile(res.data.data);
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <nav className="navbar">
        <Link to="/dashboard" className="navbar-brand">
          <div className="icon">🏥</div>
          <span>MigraHealth Kerala</span>
        </Link>
        <div className="navbar-right">
          <span className={`role-badge ${user?.role}`}>{user?.role}</span>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <Link to="/dashboard" className="breadcrumb-link">← Dashboard</Link>
            <h1 className="page-title">My Health Profile</h1>
          </div>
          {!editing && (
            <button
              id="edit-profile-btn"
              className="btn btn-primary"
              style={{ width: 'auto' }}
              onClick={() => setEditing(true)}
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert-success" style={{ marginBottom: '1rem' }}>
            <span>✅</span><span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="records-loading">
            <div className="spinner"></div>
            <span>Loading profile...</span>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="profile-grid">
              {/* Personal Info Card */}
              <div className="profile-card">
                <h3 className="profile-card-title">👤 Personal Information</h3>
                <div className="profile-user-row">
                  <div className="profile-avatar">{user?.name?.[0]?.toUpperCase()}</div>
                  <div>
                    <p className="profile-name">{user?.name}</p>
                    <p className="profile-sub">📱 {user?.phone}</p>
                    {user?.email && <p className="profile-sub">✉️ {user.email}</p>}
                    {user?.homeState && <p className="profile-sub">🏠 {user.homeState}</p>}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="p-dob">Date of Birth</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🎂</span>
                      <input id="p-dob" type="date" name="dateOfBirth"
                        value={formData.dateOfBirth} onChange={handleChange}
                        disabled={!editing} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="p-gender">Gender</label>
                    <div className="input-wrapper">
                      <span className="input-icon">⚧</span>
                      <select id="p-gender" name="gender"
                        value={formData.gender} onChange={handleChange}
                        disabled={!editing}>
                        <option value="">-- Select --</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="p-blood">Blood Group</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🩸</span>
                      <select id="p-blood" name="bloodGroup"
                        value={formData.bloodGroup} onChange={handleChange}
                        disabled={!editing}>
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="profile-card">
                <h3 className="profile-card-title">📍 Current Address in Kerala</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="p-district">District</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🗺️</span>
                      <select id="p-district" name="district"
                        value={formData.district} onChange={handleChange}
                        disabled={!editing}>
                        <option value="">-- District --</option>
                        {['Thiruvananthapuram','Kollam','Pathanamthitta','Alappuzha','Kottayam',
                          'Idukki','Ernakulam','Thrissur','Palakkad','Malappuram',
                          'Kozhikode','Wayanad','Kannur','Kasaragod'].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-city">City / Town</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🏙️</span>
                      <input id="p-city" type="text" name="city"
                        value={formData.city} onChange={handleChange}
                        placeholder="e.g. Kakkanad" disabled={!editing} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Info */}
              <div className="profile-card">
                <h3 className="profile-card-title">⚕️ Medical Information</h3>
                <div className="form-group">
                  <label htmlFor="p-allergies">Allergies (comma separated)</label>
                  <div className="input-wrapper">
                    <span className="input-icon">⚠️</span>
                    <input id="p-allergies" type="text" name="allergiesText"
                      value={formData.allergiesText} onChange={handleChange}
                      placeholder="e.g. Penicillin, Peanuts" disabled={!editing} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="p-chronic">Chronic Conditions (comma separated)</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🫀</span>
                    <input id="p-chronic" type="text" name="chronicText"
                      value={formData.chronicText} onChange={handleChange}
                      placeholder="e.g. Diabetes, Hypertension" disabled={!editing} />
                  </div>
                </div>

                {/* Tag display (view mode) */}
                {!editing && (
                  <div className="tag-display">
                    {textToArray(formData.allergiesText).map((a) => (
                      <span key={a} className="tag tag-danger">{a}</span>
                    ))}
                    {textToArray(formData.chronicText).map((c) => (
                      <span key={c} className="tag tag-warning">{c}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="profile-card">
                <h3 className="profile-card-title">🚨 Emergency Contact</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="p-ec-name">Name</label>
                    <div className="input-wrapper">
                      <span className="input-icon">👤</span>
                      <input id="p-ec-name" type="text" name="ecName"
                        value={formData.ecName} onChange={handleChange}
                        placeholder="Contact name" disabled={!editing} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-ec-phone">Phone</label>
                    <div className="input-wrapper">
                      <span className="input-icon">📱</span>
                      <input id="p-ec-phone" type="tel" name="ecPhone"
                        value={formData.ecPhone} onChange={handleChange}
                        placeholder="10-digit number" maxLength={10}
                        disabled={!editing} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-ec-relation">Relation</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🤝</span>
                      <input id="p-ec-relation" type="text" name="ecRelation"
                        value={formData.ecRelation} onChange={handleChange}
                        placeholder="e.g. Spouse, Parent" disabled={!editing} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Doctor */}
            {profile?.assignedDoctor && (
              <div className="profile-card" style={{ marginTop: '1rem' }}>
                <h3 className="profile-card-title">⚕️ Assigned Doctor</h3>
                <p className="profile-name">{profile.assignedDoctor.name}</p>
                <p className="profile-sub">📱 {profile.assignedDoctor.phone}</p>
              </div>
            )}

            {/* Save / Cancel */}
            {editing && (
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button id="save-profile-btn" type="submit"
                  className="btn btn-primary" style={{ width: 'auto' }}
                  disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
};

export default ProfilePage;
