import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M17.5 14v6M14.5 17h6"/>
      </svg>
    ),
    title: 'AI-Powered',
    desc: 'Smart resume screening, interview evaluation & analytics',
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    title: 'Complete HRM',
    desc: 'Manage employees, attendance, leaves, payroll & more',
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    ),
    title: 'Analytics',
    desc: 'Real-time dashboards with AI-driven insights',
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    ),
    title: 'Multi-Tenant',
    desc: 'Secure company isolation with role-based access',
  },
];

const Home = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 40%, #3b1fa8 70%, #1e1060 100%)',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .feat-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 28px 24px;
          transition: background 0.25s, transform 0.25s;
        }
        .feat-card:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-3px);
        }
        .feat-icon {
          width: 52px; height: 52px; border-radius: 12px;
          background: rgba(129,140,248,0.15);
          display: flex; align-items: center; justify-content: center;
          color: #a5b4fc; margin-bottom: 16px;
        }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px; background: #6366f1; color: #fff;
          border: none; border-radius: 10px; font-size: 1rem; font-weight: 600;
          cursor: pointer; text-decoration: none; font-family: inherit;
          transition: background 0.2s, transform 0.15s;
        }
        .btn-primary:hover { background: #4f46e5; transform: translateY(-1px); }
        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px; background: transparent; color: rgba(255,255,255,0.8);
          border: 1.5px solid rgba(255,255,255,0.25); border-radius: 10px;
          font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none;
          font-family: inherit; transition: border-color 0.2s, color 0.2s;
        }
        .btn-outline:hover { border-color: rgba(255,255,255,0.6); color: #fff; }
      `}</style>

      {/* Hero Section */}
      <section style={{ paddingTop: 90, paddingBottom: 80, textAlign: 'center', maxWidth: 800, margin: '0 auto', padding: '90px 24px 80px' }}>
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', fontWeight: 800, color: '#fff', lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-1px' }}>
          AI-Powered Human Resource
          <span style={{ display: 'block', color: '#818cf8', marginTop: 4 }}>Management System</span>
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.6)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Streamline recruitment, automate interviews, manage payroll, and gain actionable insights — all powered by artificial intelligence.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/contact" className="btn-primary">Start 7-Day Free Trial</Link>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
          {features.map((feature, index) => (
            <div key={index} className="feat-card">
              <div className="feat-icon">{feature.icon}</div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', margin: '0 0 8px' }}>{feature.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ maxWidth: 1100, margin: '0 auto 60px', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18, padding: '48px 32px', textAlign: 'center'
        }}>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.8rem', margin: '0 0 12px' }}>Ready to organize HR in one place?</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', margin: '0 0 28px' }}>
            Start a company trial and explore AI-assisted recruitment, subscription billing, payroll, attendance, and analytics.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn-primary">Start Free Trial</Link>
            <Link to="/about" className="btn-outline">Learn More</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;