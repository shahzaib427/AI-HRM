import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { FaBuilding, FaEnvelope, FaSpinner, FaFlask, FaLock } from 'react-icons/fa';

const GuestSubscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('planId');

  const [plans, setPlans] = useState(null);
  const [mockMode, setMockMode] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { data } = await axiosInstance.get('/billing/plans');
        if (data.success) {
          setPlans(data.data.plans);
          setMockMode(data.data.mockMode);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  const plan = plans?.[planId];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) return setError('Company name is required');
    if (!email.trim()) return setError('Admin email is required');
    if (!plan) return setError('Please select a valid plan');

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/subscription/guest-checkout', {
        companyName: companyName.trim(),
        email: email.trim(),
        planId
      });

      if (data.success && data.data.url) {
        if (data.data.mock) {
          // Mock checkout lives inside this same React app — navigate
          // client-side instead of a full page reload, so there's no
          // white-flash/loading screen between GuestSubscribe and
          // MockCheckoutPage. Real Stripe still needs a hard redirect
          // since that's an external domain.
          navigate(`/mock-checkout/${data.data.id}`);
        } else {
          window.location.href = data.data.url;
        }
      } else {
        setError('Could not start checkout. Please try again.');
      }
    } catch (err) {
      if (err.response?.data?.code === 'ACCOUNT_EXISTS') {
        setError('An account with this email already exists. Please log in and subscribe from your billing page.');
      } else {
        setError(err.response?.data?.message || 'Failed to start checkout');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const shellClass = 'min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] relative overflow-hidden flex items-center justify-center px-4';

  if (loadingPlans) {
    return (
      <div className={shellClass}>
        <FaSpinner className="w-6 h-6 text-indigo-300 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={shellClass}>
        <div className="relative text-center bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm px-8 py-12 max-w-sm w-full">
          <h1 className="text-xl font-bold text-white mb-2">Plan not found</h1>
          <p className="text-indigo-200/70 mb-6 text-sm">Please pick a plan from the pricing page.</p>
          <button
            onClick={() => navigate('/billing')}
            className="px-6 py-2.5 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 rounded-lg text-sm font-semibold transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-500/20 rounded-full blur-[120px]" />

      <div className="relative max-w-md w-full py-12">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <FaLock className="text-white text-xs" />
          </span>
          <span className="text-white font-bold text-lg tracking-tight">AI-HRM</span>
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-1 text-center">Start your subscription</h1>
        <p className="text-indigo-200/70 mb-8 text-center text-sm">
          Just a couple of details, then you'll pay securely via Stripe.
        </p>

        {mockMode && (
          <div className="mb-6 flex items-center gap-2 bg-amber-400/10 border border-amber-300/30 text-amber-200 text-sm rounded-lg px-4 py-3">
            <FaFlask className="shrink-0" /> Demo/mock payment mode — no real charges will occur.
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-6 mb-6">
          <p className="text-xs uppercase tracking-widest text-indigo-300 mb-2">Selected plan</p>
          <p className="text-lg font-semibold text-white">{plan.name}</p>
          {plan.employeeLimit && (
            <p className="text-sm text-indigo-200/70">Up to {plan.employeeLimit} employees</p>
          )}
          <p className="text-3xl font-extrabold text-white mt-3">
            ${(plan.amount / 100).toFixed(0)}
            <span className="text-sm font-normal text-indigo-200/70">/mo</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-400/10 border border-red-300/30 text-red-200 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-100 mb-1.5">Company Name</label>
            <div className="relative">
              <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/60 text-sm" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ABC Software"
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-sm text-white placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-100 mb-1.5">Admin Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/60 text-sm" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@abcsoftware.com"
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
            {submitting ? 'Starting checkout...' : 'Continue to Payment'}
          </button>

          <p className="text-xs text-indigo-300/60 text-center pt-1">
            Already have an account?{' '}
            <a href="/login" className="text-indigo-300 hover:text-indigo-200 font-medium">
              Log in
            </a>{' '}
            to subscribe from your billing page instead.
          </p>
        </form>
      </div>
    </div>
  );
};

export default GuestSubscribe;