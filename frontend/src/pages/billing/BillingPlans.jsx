import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { useAuth } from '../../contexts/AuthContext';
import { FaCheck, FaSpinner, FaStar, FaUserTie } from 'react-icons/fa';

const BillingPlans = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null); // planId currently being purchased

  const loadStatus = async () => {
    try {
      setLoading(true);
      // Logged in → get plans + their subscription (protected endpoint).
      // Logged out → just the public price list.
      const endpoint = currentUser ? '/billing/status' : '/billing/plans';
      const { data } = await axiosInstance.get(endpoint);
      if (data.success) setStatus(data.data);
    } catch (err) {
      console.error('Failed to load billing status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reload whenever auth state changes (e.g. user logs in on another tab,
  // or just came back from a successful login) so status/subscription
  // data is fetched with the right endpoint.
  useEffect(() => { loadStatus(); }, [currentUser]);

  const handleSubscribe = async (planId) => {
    // Not logged in → send to guest checkout, which collects company
    // name + admin email and creates the account as part of payment.
    // (No need to force a login/signup before they've even paid.)
    if (!currentUser) {
      navigate(`/billing/subscribe?planId=${planId}`);
      return;
    }

    try {
      setCheckingOut(planId);
      const { data } = await axiosInstance.post('/billing/checkout-session', { planId });
      if (data.success && data.data.url) {
        if (data.data.mock) {
          // Mock checkout lives inside this same React app — navigate
          // client-side instead of a full page reload, avoiding a
          // white-flash/loading screen. Real Stripe still needs a hard
          // redirect since that's an external domain.
          navigate(`/mock-checkout/${data.data.id}`);
        } else {
          window.location.href = data.data.url;
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start checkout');
      setCheckingOut(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] flex items-center justify-center">
        <FaSpinner className="w-6 h-6 text-indigo-300 animate-spin" />
      </div>
    );
  }

  const currentPlan = status?.subscription?.planId;
  const currentStatus = status?.subscription?.status;
  const planEntries = Object.entries(status?.plans || {});
  // Middle plan is treated as the recommended tier — swap this to a
  // planId if you want to pin "Most Popular" to a specific plan instead.
  const popularIndex = Math.floor((planEntries.length - 1) / 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] relative overflow-hidden">
      {/* Scoped keyframes for card entrance + ambient glow drift */}
      <style>{`
        @keyframes hrmCardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes hrmGlowDrift {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-50%, -3%) scale(1.06); }
        }
        @keyframes hrmBadgePop {
          from { opacity: 0; transform: translate(-50%, 6px) scale(0.85); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .hrm-card {
          opacity: 0;
          animation: hrmCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hrm-glow {
          animation: hrmGlowDrift 9s ease-in-out infinite;
        }
        .hrm-badge {
          animation: hrmBadgePop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.5s;
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .hrm-card, .hrm-glow, .hrm-badge { animation: none; opacity: 1; }
        }
      `}</style>

      {/* Ambient glow, echoes the homepage hero */}
      <div className="hrm-glow pointer-events-none absolute top-[-10%] left-1/2 w-[700px] h-[700px] bg-indigo-500/20 rounded-full blur-[120px]" />

      <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-20">
        {/* Brand mark, mirrors the homepage nav so this still feels like AI-HRM */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <FaUserTie className="text-white text-sm" />
          </span>
          <span className="text-white font-bold text-lg tracking-tight">AI-HRM</span>
        </div>

        <div className="text-center mb-4">
          <span className="inline-block text-xs font-semibold tracking-widest text-indigo-300 uppercase mb-3">
            HRM Subscription
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Choose the plan that fits your team
          </h1>
          <p className="text-indigo-200/80 max-w-xl mx-auto">
            {currentStatus === 'active'
              ? `You're currently on ${status.plans[currentPlan]?.name || currentPlan}.`
              : currentUser
              ? 'Every plan includes full HRM access — pick the seat count that matches your headcount.'
              : "Pick a plan below — you'll sign in or create an account at checkout."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {planEntries.map(([planId, plan], i) => {
            const isCurrent = currentPlan === planId && currentStatus === 'active';
            const isPopular = i === popularIndex && !isCurrent;

            return (
              <div
                key={planId}
                style={{ animationDelay: `${i * 0.12}s` }}
                className={`hrm-card group relative flex flex-col rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                  isCurrent
                    ? 'bg-white/10 border-2 border-emerald-400/70 shadow-[0_0_30px_-5px_rgba(52,211,153,0.35)]'
                    : isPopular
                    ? 'bg-white/10 border-2 border-indigo-300/70 shadow-[0_0_40px_-5px_rgba(129,140,248,0.45)] md:scale-105 hover:md:scale-[1.08]'
                    : 'bg-white/5 border border-white/10 hover:border-white/20'
                }`}
              >
                {isPopular && (
                  <span className="hrm-badge absolute -top-3 left-1/2 inline-flex items-center gap-1 bg-indigo-400 text-indigo-950 text-xs font-bold px-3 py-1 rounded-full">
                    <FaStar className="text-[10px]" /> Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="hrm-badge absolute -top-3 left-1/2 inline-flex items-center gap-1 bg-emerald-400 text-emerald-950 text-xs font-bold px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                )}

                <h3 className="text-lg font-semibold text-white mt-2">{plan.name}</h3>
                <p className="text-4xl font-extrabold text-white mt-2 transition-transform duration-300 group-hover:scale-105 origin-left">
                  ${(plan.amount / 100).toFixed(0)}
                  <span className="text-sm font-normal text-indigo-200/70">/mo</span>
                </p>

                <ul className="mt-5 space-y-2.5 text-sm text-indigo-100/80 flex-1">
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-emerald-400 text-xs shrink-0" /> Full HRM access
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-emerald-400 text-xs shrink-0" /> Attendance & leave modules
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-emerald-400 text-xs shrink-0" /> Email support
                  </li>
                </ul>

                <button
                  onClick={() => handleSubscribe(planId)}
                  disabled={checkingOut !== null || isCurrent}
                  className={`mt-6 w-full py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] ${
                    isCurrent
                      ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/40'
                      : isPopular
                      ? 'bg-indigo-400 hover:bg-indigo-300 text-indigo-950 hover:shadow-lg hover:shadow-indigo-400/30'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {checkingOut === planId ? (
                    <FaSpinner className="animate-spin inline" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BillingPlans;