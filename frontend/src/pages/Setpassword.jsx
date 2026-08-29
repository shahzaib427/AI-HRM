import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { FaLock, FaSpinner, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        const { data } = await axiosInstance.get('/subscription/setup-token-check', {
          params: { token }
        });
        if (data.success) {
          setTokenValid(true);
          setEmail(data.data.email);
        }
      } catch (err) {
        setTokenValid(false);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/subscription/set-password', {
        token,
        password,
        confirmPassword
      });
      if (data.success) {
        setDone(true);
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  const shellClass =
    'min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] relative overflow-hidden flex items-center justify-center px-4';

  const Glow = () => (
    <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-500/20 rounded-full blur-[120px]" />
  );

  const Brand = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
        <FaShieldAlt className="text-white text-xs" />
      </span>
      <span className="text-white font-bold text-lg tracking-tight">AI-HRM</span>
    </div>
  );

  if (checking) {
    return (
      <div className={shellClass}>
        <Glow />
        <FaSpinner className="w-6 h-6 text-indigo-300 animate-spin relative" />
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className={shellClass}>
        <Glow />
        <div className="relative max-w-md w-full text-center py-12">
          <Brand />
          <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm px-8 py-10">
            <h1 className="text-xl font-bold text-white mb-2">Link invalid or expired</h1>
            <p className="text-indigo-200/70 mb-6 text-sm">
              This password setup link is no longer valid. Please contact support or start a new
              subscription.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-2.5 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 rounded-lg text-sm font-semibold transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={shellClass}>
        <Glow />
        <div className="relative max-w-md w-full text-center py-12">
          <div className="w-20 h-20 rounded-full bg-emerald-400/10 border border-emerald-300/30 flex items-center justify-center mx-auto mb-6">
            <FaCheckCircle className="text-emerald-400 text-4xl" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Password created</h1>
          <p className="text-indigo-200/70">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <Glow />

      <div className="relative max-w-md w-full py-12">
        <Brand />

        <h1 className="text-2xl font-extrabold text-white mb-1 text-center">Create Your HRM Password</h1>
        <p className="text-indigo-200/70 mb-8 text-center text-sm">
          Email: <span className="font-semibold text-white">{email}</span>
        </p>

        {error && (
          <div className="mb-4 bg-red-400/10 border border-red-300/30 text-red-200 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-6">
          <div>
            <label className="block text-sm font-medium text-indigo-100 mb-1.5">New Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/60 text-sm" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-sm text-white placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-100 mb-1.5">Confirm Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/60 text-sm" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-sm text-white placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {submitting ? <FaSpinner className="animate-spin" /> : null}
            {submitting ? 'Saving...' : 'Create Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;