import { createContext, useState, useEffect, useContext } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // On app load, check if user is already logged in via cookie
  useEffect(() => {
    loadUser();
  }, []);

  // Load user from /api/auth/me
  const loadUser = async () => {
    try {
      const res = await API.get('/auth/me');
      setUser(res.data.user);
      setError(null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (formData) => {
    try {
      setError(null);
      const res = await API.post('/auth/register', formData);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (err) {
      const message =
        err.response?.data?.error || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Login user
  const login = async (phone, password) => {
    try {
      setError(null);
      const res = await API.post('/auth/login', { phone, password });
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (err) {
      const message =
        err.response?.data?.error || 'Login failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await API.get('/auth/logout');
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
