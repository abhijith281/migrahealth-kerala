import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Login = () => {
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setError(null);
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData.phone, formData.password);
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

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <div className="auth-logo-text">
            <strong>MigraHealth Kerala</strong>
            <span>SIH25083 · Digital Health Records</span>
          </div>
        </div>

        <div className="flex-between" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <LanguageSwitcher compact={true} />
        </div>

        <h1 className="auth-title">{t('welcome')}</h1>
        <p className="auth-subtitle">{t('login')}</p>

        {/* Error */}
        {error && (
          <div className="alert-error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Phone */}
          <div className="form-group">
            <label htmlFor="login-phone">{t('phone')}</label>
            <div className="input-wrapper">
              <span className="input-icon">📱</span>
              <input
                id="login-phone"
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
            <label htmlFor="login-password">{t('password')}</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="login-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
                {t('loading')}
              </>
            ) : (
              `${t('login')} →`
            )}
          </button>
        </form>

        <div className="divider">or</div>

        <p className="auth-footer">
          <Link to="/register">{t('register')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
