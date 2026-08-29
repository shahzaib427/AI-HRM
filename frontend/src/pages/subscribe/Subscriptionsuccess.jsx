import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';

// Purely informational — the webhook (not this page) is the source of
// truth for provisioning the account. Landing here never logs anyone in
// or grants access on its own.
const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] relative overflow-hidden flex items-center justify-center px-4">
      <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="relative max-w-md w-full text-center py-12">
        <div className="w-20 h-20 rounded-full bg-emerald-400/10 border border-emerald-300/30 flex items-center justify-center mx-auto mb-6">
          <FaCheckCircle className="text-emerald-400 text-4xl" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Payment Successful</h1>
        <p className="text-indigo-200/80 mb-1">Your HRM account has been created.</p>
        {email && (
          <p className="text-indigo-200/80 mb-6">
            A password setup email has been sent to{' '}
            <span className="font-semibold text-white">{email}</span>.
          </p>
        )}
        <p className="text-sm text-indigo-300/60 mb-10">
          Please check your inbox to finish setting up your account.
        </p>

        <Link
          to="/"
          className="inline-block px-8 py-2.5 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 rounded-lg text-sm font-semibold transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;