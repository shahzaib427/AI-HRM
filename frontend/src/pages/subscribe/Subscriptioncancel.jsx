import React from 'react';
import { Link } from 'react-router-dom';
import { FaTimesCircle } from 'react-icons/fa';

const SubscriptionCancel = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] relative overflow-hidden flex items-center justify-center px-4">
      <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-500/15 rounded-full blur-[120px]" />

      <div className="relative max-w-md w-full text-center py-12">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/15 flex items-center justify-center mx-auto mb-6">
          <FaTimesCircle className="text-indigo-300/70 text-4xl" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Checkout Cancelled</h1>
        <p className="text-indigo-200/70 mb-10">No charge was made. You can pick a plan again anytime.</p>

        <Link
          to="/billing"
          className="inline-block px-8 py-2.5 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 rounded-lg text-sm font-semibold transition-colors"
        >
          Back to Plans
        </Link>
      </div>
    </div>
  );
};

export default SubscriptionCancel;