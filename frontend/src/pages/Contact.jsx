import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiMail, FiMessageCircle, FiPhone, FiShield } from 'react-icons/fi';
import axios from 'axios';

const Input = ({ label, type = 'text', value, onChange }) => (
  <div style={{ width: '100%' }}>
    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.825rem', fontWeight: 600, color: '#374151' }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        padding: '10px 14px',
        border: '1.5px solid #e5e7eb',
        borderRadius: 8,
        fontSize: '0.9rem',
        fontFamily: "'DM Sans', sans-serif",
        color: '#111827',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
      onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
    />
  </div>
);

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    fullName: '', 
    companyName: '', 
    phone: '', 
    email: '', 
    message: '' 
  });
  
  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Function to submit to backend API
  const submitToBackend = async (formData) => {
    // Use relative URL or environment variable with fallback
    const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';
    
    const response = await axios.post(`${API_URL}/contact`, formData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    return response.data;
  };

  const submit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.fullName || !form.email) { 
      alert('Please fill required fields'); 
      return; 
    }

    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(form.email)) {
      alert('Please provide a valid email address');
      return;
    }
    
    setLoading(true);
    try {
      const result = await submitToBackend({
        fullName: form.fullName,
        email: form.email,
        companyName: form.companyName,
        phone: form.phone,
        message: form.message
      });
      
      alert(result.message || 'Thanks! Your request is submitted successfully.');
      
      // Reset form
      setForm({ 
        fullName: '', 
        email: '', 
        phone: '', 
        companyName: '', 
        message: '' 
      });
      
    } catch (error) {
      console.error('Submission error:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to submit. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    display: 'flex', gap: 16, borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    padding: '20px', backdropFilter: 'blur(8px)',
  };

  const smallCardStyle = {
    borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)', padding: '20px',
    backdropFilter: 'blur(8px)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 40%, #3b1fa8 70%, #1e1060 100%)',
      fontFamily: "'DM Sans', sans-serif",
      color: '#fff',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 40,
          padding: '72px 0',
          alignItems: 'center',
        }}>
          {/* Left Column */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#a5b4fc', margin: '0 0 16px' }}>
              Contact
            </p>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
              Let us help you set up AI-HRM
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 28px' }}>
              Share your details and our team will help with trial access, subscription questions, and company onboarding.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={cardStyle}>
                <FiMail style={{ width: 22, height: 22, color: '#a5b4fc', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h2 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 6px' }}>Sales & Trial Requests</h2>
                  <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
                    Request a free trial, ask about plans, or discuss your company setup.
                  </p>
                </div>
              </div>

              <div style={cardStyle}>
                <FiMessageCircle style={{ width: 22, height: 22, color: '#a5b4fc', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h2 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 6px' }}>Product Questions</h2>
                  <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
                    Learn how recruitment, payroll, attendance, analytics, and AI interviews work together.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={smallCardStyle}>
                  <FiClock style={{ width: 20, height: 20, color: '#a5b4fc', marginBottom: 10 }} />
                  <h2 style={{ fontWeight: 600, fontSize: '0.9rem', margin: '0 0 6px' }}>Quick Response</h2>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>We review access requests as soon as possible.</p>
                </div>
                <div style={smallCardStyle}>
                  <FiShield style={{ width: 20, height: 20, color: '#a5b4fc', marginBottom: 10 }} />
                  <h2 style={{ fontWeight: 600, fontSize: '0.9rem', margin: '0 0 6px' }}>Secure Setup</h2>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>Company data stays isolated with role-based access.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20,
            padding: 8,
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(12px)',
          }}>
            <form onSubmit={submit} style={{ background: '#fff', borderRadius: 14, padding: '32px', color: '#111827' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#eff6ff', color: '#3b82f6', borderRadius: 100,
                  padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600, marginBottom: 12,
                }}>
                  <FiPhone style={{ width: 14, height: 14 }} /> Talk to us
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px' }}>Send your request</h2>
                <p style={{ fontSize: '0.825rem', color: '#6b7280', margin: 0 }}>
                  Provide your details and our team will help you get started with AI-HRM.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="Full Name *" value={form.fullName} onChange={update('fullName')} />
                <Input label="Work Email *" type="email" value={form.email} onChange={update('email')} />
                <Input label="Company Name" value={form.companyName} onChange={update('companyName')} />
                <Input label="Phone" value={form.phone} onChange={update('phone')} />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.825rem', fontWeight: 600, color: '#374151' }}>Message</label>
                <textarea
                  style={{
                    width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
                    borderRadius: 8, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif",
                    color: '#111827', outline: 'none', boxSizing: 'border-box',
                    minHeight: 120, resize: 'vertical', transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  placeholder="Tell us about your company size, subscription questions, or HR needs."
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '11px 26px', background: '#6366f1', color: '#fff',
                    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem',
                    fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1, transition: 'background 0.2s',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
                <Link to="/" style={{ fontSize: '0.825rem', fontWeight: 500, color: '#9ca3af', textDecoration: 'none' }}>
                  Back Home
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}