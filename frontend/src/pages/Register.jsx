import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { code: 'ml', label: 'Malayalam' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'or', label: 'Odia' },
  { code: 'en', label: 'English' },
];

const HOME_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const Register = () => {
  const navigate = useNavigate();
  const { register, error, setError } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
    language: 'en',
    homeState: '',
    aadhaarLast4: '',
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setError(null);
    setLocalError('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      return 'Enter a valid 10-digit Indian phone number starting with 6-9.';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match.';
    }
    if (formData.aadhaarLast4 && !/^\d{4}$/.test(formData.aadhaarLast4)) {
      return 'Aadhaar last 4 digits must be exactly 4 digits.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    const result = await register(formData);
    setLoading(false);
    
    if (result.success) {
      if (result.user?.role === 'admin') {
        navigate('/admin');
      } else if (result.user?.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <div className="auth-logo-text">
            <strong>MigraHealth Kerala</strong>
            <span>SIH25083 · Digital Health Records</span>
          </div>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Register as a migrant worker, doctor, or admin</p>

        {/* Error */}
        {displayError && (
          <div className="alert-error" role="alert">
            <span>⚠️</span>
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">

            {/* Name */}
            <div className="form-group full">
              <label htmlFor="reg-name">Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="form-group full">
              <label htmlFor="reg-phone">Phone Number (Login ID)</label>
              <div className="input-wrapper">
                <span className="input-icon">📱</span>
                <input
                  id="reg-phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="reg-confirm-password">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="reg-confirm-password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Role */}
            <div className="form-group">
              <label htmlFor="reg-role">Role</label>
              <div className="input-wrapper">
                <span className="input-icon">🎭</span>
                <select
                  id="reg-role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="patient">Patient (Migrant Worker)</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Language */}
            <div className="form-group">
              <label htmlFor="reg-language">Preferred Language</label>
              <div className="input-wrapper">
                <span className="input-icon">🌐</span>
                <select
                  id="reg-language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Home State */}
            <div className="form-group">
              <label htmlFor="reg-homeState">Home State</label>
              <div className="input-wrapper">
                <span className="input-icon">🗺️</span>
                <select
                  id="reg-homeState"
                  name="homeState"
                  value={formData.homeState}
                  onChange={handleChange}
                >
                  <option value="">-- Select State --</option>
                  {HOME_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Aadhaar Last 4 */}
            <div className="form-group">
              <label htmlFor="reg-aadhaar">Aadhaar Last 4 Digits</label>
              <div className="input-wrapper">
                <span className="input-icon">🪪</span>
                <input
                  id="reg-aadhaar"
                  type="text"
                  name="aadhaarLast4"
                  value={formData.aadhaarLast4}
                  onChange={handleChange}
                  placeholder="e.g. 4321"
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Email (optional) */}
            <div className="form-group full">
              <label htmlFor="reg-email">
                Email{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner"
                  style={{ width: 18, height: 18, borderWidth: 2 }}
                ></span>
                Creating account...
              </>
            ) : (
              'Create Account →'
            )}
          </button>
        </form>

        <div className="divider">or</div>

        <p className="auth-footer">
          Already registered?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
