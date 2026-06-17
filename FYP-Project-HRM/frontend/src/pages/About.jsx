import { Link } from 'react-router-dom';
import { FiBarChart2, FiBookOpen, FiCheckCircle, FiCreditCard, FiShield, FiUsers } from 'react-icons/fi';

export default function AboutPage() {
  const highlights = [
    {
      icon: FiUsers,
      title: 'Complete HR Workspace',
      text: 'Manage recruitment, employees, attendance, leave requests, payroll, meetings, and team performance from one secure portal.',
    },
    {
      icon: FiShield,
      title: 'Role-Based Access',
      text: 'Separate workspaces for Super Admin, CEO, HR, Manager, Employee, and Applicant keep company data organized and protected.',
    },
    {
      icon: FiBarChart2,
      title: 'AI Insights',
      text: 'Use AI-assisted screening, interview evaluation, and dashboards to make faster, more informed HR decisions.',
    },
  ];

  const plans = [
    '7-day free trial for new companies',
    'Subscription billing for CEO accounts',
    'Plan access designed around company growth',
    'Secure billing history and subscription management',
  ];

  const articles = [
    'How AI screening improves shortlisting quality',
    'Why centralized payroll and attendance reduce HR workload',
    'Building a scalable onboarding flow for growing teams',
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 40%, #3b1fa8 70%, #1e1060 100%)',
      fontFamily: "'DM Sans', sans-serif",
      color: '#fff',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* Hero */}
        <section style={{ padding: '80px 0 48px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#a5b4fc', margin: '0 0 16px' }}>
            About AI-HRM
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 auto 20px', maxWidth: 800, letterSpacing: '-1px' }}>
            A smarter HR platform for modern companies
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.6)', maxWidth: 680, margin: '0 auto', lineHeight: 1.7 }}>
            AI-HRM helps organizations run hiring, employee management, payroll, analytics, and company operations with secure multi-tenant access and AI-powered workflows.
          </p>
        </section>

        {/* Highlights */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 24 }}>
          {highlights.map((item) => (
            <div key={item.title} style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '28px 24px',
              transition: 'background 0.25s, transform 0.25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <item.icon style={{ marginBottom: 16, width: 40, height: 40, color: '#a5b4fc' }} />
              <h2 style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0 0 10px' }}>{item.title}</h2>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </section>

        {/* Billing + Blog */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 24 }}>
          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <FiCreditCard style={{ width: 32, height: 32, color: '#a5b4fc' }} />
              <h2 style={{ fontWeight: 700, fontSize: '1.3rem', margin: 0 }}>Subscription & Billing</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 20 }}>
              Companies can begin with a free trial, then manage subscription access from the CEO portal as the organization grows.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {plans.map((plan) => (
                <div key={plan} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                  <FiCheckCircle style={{ width: 16, height: 16, color: '#86efac', flexShrink: 0, marginTop: 2 }} />
                  <span>{plan}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <FiBookOpen style={{ width: 32, height: 32, color: '#a5b4fc' }} />
              <h2 style={{ fontWeight: 700, fontSize: '1.3rem', margin: 0 }}>HR Insights</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 20 }}>
              Blog-style resources help teams understand how AI-HRM supports better hiring, cleaner operations, and faster decisions.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {articles.map((article) => (
                <div key={article} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: '0.875rem',
                  color: 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  {article}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18,
          padding: '48px 32px',
          textAlign: 'center',
          marginBottom: 60,
        }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.8rem', margin: '0 0 12px' }}>Ready to organize HR in one place?</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', margin: '0 0 28px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            Start a company trial and explore AI-assisted recruitment, subscription billing, payroll, attendance, and analytics.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/company-registration" style={{
              padding: '13px 28px', background: '#6366f1', color: '#fff',
              borderRadius: 10, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
              onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
            >
              Start Free Trial
            </Link>
            <Link to="/" style={{
              padding: '13px 28px', background: 'transparent', color: 'rgba(255,255,255,0.8)',
              border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 10, fontWeight: 600,
              fontSize: '0.95rem', textDecoration: 'none', transition: 'border-color 0.2s',
            }}>
              Back Home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}