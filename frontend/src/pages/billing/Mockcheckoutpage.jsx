import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { FaLock, FaSpinner, FaFlask, FaCreditCard } from 'react-icons/fa';

// Mounted at /mock-checkout/:sessionId
// This page ONLY exists to simulate what Stripe's hosted checkout page
// would normally do. It's never reached once real Stripe keys are
// configured, since paymentService.js redirects to the real Stripe URL
// instead. The card fields below are fully interactive for realism and
// have basic format validation, but nothing is ever actually charged or
// sent anywhere — completeMockCheckout on the backend doesn't read them.
const MockCheckoutPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const formatCardNumber = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const cardDigits = cardNumber.replace(/\D/g, '');
  const isCardValid = cardDigits.length === 16;
  const isExpiryValid = /^\d{2}\/\d{2}$/.test(expiry);
  const isCvcValid = cvc.length >= 3;
  const canPay = isCardValid && isExpiryValid && isCvcValid && !paying;

  const handlePay = async () => {
    if (!canPay) return;
    try {
      setPaying(true);
      const { data } = await axiosInstance.post(`/billing/mock/complete/${sessionId}`);
      if (data.success) {
        navigate(`/billing/success?session_id=${sessionId}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Mock payment failed');
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] relative overflow-hidden flex items-center justify-center p-4">
      <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-500/20 rounded-full blur-[120px]" />

      <div className="relative bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center gap-2 text-amber-200 text-xs font-medium bg-amber-400/10 border border-amber-300/30 rounded-lg px-3 py-2 mb-5">
          <FaFlask className="shrink-0" /> Demo checkout — no real card is charged
        </div>

        <h2 className="text-lg font-semibold text-white mb-1">Complete your purchase</h2>
        <p className="text-sm text-indigo-200/60 mb-6 font-mono">
          {sessionId.slice(0, 18)}...
        </p>

        <div className="space-y-3 mb-2">
          <div className="relative">
            <FaCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/60 text-sm" />
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/5 border border-white/15 rounded-lg text-white placeholder-indigo-300/40 tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM / YY"
              inputMode="numeric"
              className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/15 rounded-lg text-white placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 transition-colors"
            />
            <input
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="CVC"
              inputMode="numeric"
              className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/15 rounded-lg text-white placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 transition-colors"
            />
          </div>
        </div>
        <p className="text-xs text-indigo-300/50 mb-6">
          Any 16-digit number works — try the Stripe test card above.
        </p>

        <button
          onClick={handlePay}
          disabled={!canPay}
          className="w-full py-2.5 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {paying ? <FaSpinner className="animate-spin" /> : <FaLock className="text-xs" />}
          {paying ? 'Processing...' : 'Pay Now (Simulated)'}
        </button>

        <button
          onClick={() => navigate('/billing/cancel')}
          disabled={paying}
          className="w-full py-2 mt-2 text-sm text-indigo-300/70 hover:text-indigo-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MockCheckoutPage;