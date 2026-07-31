import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return setError('Email and password required');
    try {
      setLoading(true);
      setError('');
      
      const res = await axiosInstance.post('/auth/login', formData);
      const token = res.data.token || res.data.data?.token;
      const user = res.data.user || res.data.data?.user;
      
      if (!token || !user) { 
        setError('Invalid response from server'); 
        return;
      }
      
      // Store tokens first
      localStorage.setItem('authToken', token);
      localStorage.setItem('token', token);
      
      // Call login from context
      const loginSuccess = login(user, token);
      
      if (!loginSuccess) {
        setError('Login failed - please try again');
        return;
      }
      
      // Small delay to ensure auth state is updated
      setTimeout(() => {
        if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
        else if (user.role === 'hr') navigate('/hr/dashboard', { replace: true });
        else navigate('/employee/dashboard', { replace: true });
      }, 100);
      
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return setForgotError('Email is required');
    try {
      setForgotLoading(true);
      setForgotError('');
      setForgotSuccess('');
      const res = await axiosInstance.post('/auth/forgot-password', { email: forgotEmail });
      if (res.data.success) {
        setForgotSuccess('A temporary password has been sent to your email');
        setForgotEmail('');
        setTimeout(() => setShowForgotPassword(false), 5000);
      } else {
        setForgotError(res.data.message || 'Failed to send reset email');
      }
    } catch (err) {
      setForgotError(err.response?.data?.error || err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <h2 className="login-title">
            {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="login-subtitle">
            {showForgotPassword ? 'Enter your email to receive a temporary password' : 'Sign in to your account'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {forgotError && (
          <div className="alert alert-error">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{forgotError}</span>
          </div>
        )}
        {forgotSuccess && (
          <div className="alert alert-success">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{forgotSuccess}</span>
          </div>
        )}

        {!showForgotPassword ? (
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email */}
            <div className="field">
              <label className="field-label">Email Address</label>
              <div className="field-input-wrap">
                <span className="field-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="field-input"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label">Password</label>
              <div className="field-input-wrap">
                <span className="field-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="field-input"
                  placeholder="••••••••"
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="form-options">
              <label className="remember-label">
                <input type="checkbox" className="remember-checkbox" />
                <span>Remember me</span>
              </label>
              <button type="button" className="forgot-link" onClick={() => setShowForgotPassword(true)}>
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <span className="btn-inner">
                  <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>

            <p className="register-link">
              Don't have an account?{' '}
              <a href="/register" className="register-anchor">Register as Applicant</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="login-form">
            <div className="field">
              <label className="field-label">Registered Email Address</label>
              <div className="field-input-wrap">
                <span className="field-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="field-input"
                  placeholder="Enter your work email"
                />
              </div>
            </div>

            <button type="submit" disabled={forgotLoading} className="submit-btn">
              {forgotLoading ? (
                <span className="btn-inner">
                  <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </span>
              ) : 'Send Reset Link →'}
            </button>

            <button
              type="button"
              className="back-btn"
              onClick={() => { setShowForgotPassword(false); setForgotError(''); setForgotSuccess(''); setForgotEmail(''); }}
            >
              ← Back to Sign In
            </button>

            <p className="hint-text">We'll send a temporary password to your email</p>
          </form>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1040 0%, #2d1b69 40%, #3b1fa8 70%, #1e1060 100%);
          font-family: 'DM Sans', sans-serif;
          padding: 1rem;
        }

        .login-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 40px 36px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.35);
        }

        .login-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .login-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 6px;
        }

        .login-subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.825rem;
          margin-bottom: 16px;
        }

        .alert-error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 0.825rem;
          font-weight: 600;
          color: #374151;
        }

        .field-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 12px;
          color: #9ca3af;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .field-input {
          width: 100%;
          padding: 11px 40px 11px 40px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: 'DM Sans', sans-serif;
          color: #111827;
          background: #fff;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .field-input::placeholder {
          color: #9ca3af;
        }

        .field-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.15s;
        }

        .eye-btn:hover { color: #6366f1; }

        .form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: -4px;
        }

        .remember-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.825rem;
          color: #6b7280;
          cursor: pointer;
        }

        .remember-checkbox {
          accent-color: #6366f1;
          width: 14px;
          height: 14px;
        }

        .forgot-link {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.825rem;
          font-weight: 500;
          color: #6366f1;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
        }

        .forgot-link:hover { color: #4f46e5; }

        .submit-btn {
          width: 100%;
          padding: 12px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          margin-top: 2px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.4);
        }

        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .register-link {
          text-align: center;
          font-size: 0.825rem;
          color: #6b7280;
          margin: 0;
        }

        .register-anchor {
          color: #6366f1;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s;
        }

        .register-anchor:hover { color: #4f46e5; }

        .back-btn {
          width: 100%;
          padding: 11px;
          background: transparent;
          color: #374151;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .back-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .hint-text {
          text-align: center;
          font-size: 0.775rem;
          color: #9ca3af;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default Login;