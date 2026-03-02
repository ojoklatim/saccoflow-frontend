import './index.css';
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import SaccoAdminDashboard from './SaccoAdminDashboard';
import MemberDashboard from './MemberDashboard';

const features = [
  {
    title: 'Member onboarding',
    description:
      'Digitize KYC, capture member records once, and keep profiles current across branches.',
    accent: '#9bd77a',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c2-4 14-4 16 0" />
      </svg>
    ),
  },
  {
    title: 'Loan lifecycle automation',
    description:
      'Track applications, approvals, disbursement, and repayment with clean audit trails.',
    accent: '#7f92ff',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 7h4V3" />
        <path d="M17 17h-4v4" />
        <path d="M7 7a7 7 0 0 1 10 0" />
        <path d="M17 17a7 7 0 0 1-10 0" />
      </svg>
    ),
  },
  {
    title: 'Savings and shares',
    description:
      'Real-time balances, dividend tracking, and transparent member statements.',
    accent: '#5bb4ff',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="12" cy="6.5" rx="6.5" ry="3.2" />
        <path d="M5.5 6.5v5.2c0 1.8 13 1.8 13 0V6.5" />
        <path d="M5.5 11.7v5.2c0 1.8 13 1.8 13 0v-5.2" />
      </svg>
    ),
  },
  {
    title: 'Regulatory-ready reporting',
    description:
      'Generate exports and compliance packs with consistent, reviewable data.',
    accent: '#60d5c9',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h16" />
        <rect x="6" y="12" width="3" height="6" />
        <rect x="11" y="9" width="3" height="9" />
        <rect x="16" y="6" width="3" height="12" />
      </svg>
    ),
  },
  {
    title: 'Role-based operations',
    description:
      'Granular permissions, maker-checker workflows, and branch-level controls.',
    accent: '#61c589',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l7 3v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Member access',
    description:
      'Give members visibility into savings, loans, and repayments from any device.',
    accent: '#8ab1ff',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <circle cx="12" cy="17" r="1" />
      </svg>
    ),
  },
];

const flowSteps = [
  {
    title: 'Capture once',
    description: 'Digitize member data at onboarding and keep it synced everywhere.',
  },
  {
    title: 'Automate rules',
    description: 'Set policies for approval limits, delinquency alerts, and reporting.',
  },
  {
    title: 'Keep everyone informed',
    description: 'Instant statements and updates for members, teams, and regulators.',
  },
];

const outcomes = [
  {
    label: 'Less paperwork',
    value: 'Paperless workflows that scale with your SACCO.',
  },
  {
    label: 'More transparency',
    value: 'Every transaction is traceable, auditable, and easy to explain.',
  },
  {
    label: 'Faster member service',
    value: 'Decisions and access to credit happen in hours, not weeks.',
  },
];

function AnimatedHeadline() {
  const words = ["Accountability", "Transparency", "Trust", "Security"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <h1 className="reveal delay-1">
        <div style={{ marginBottom: '12px' }}>End Paperwork. Stop Fraud.</div>
        <div style={{ minHeight: '2.4em' }}>
          Build <span className="animate-word" style={{ color: '#93c5fd', display: 'inline-block' }}>{words[index]}</span>
        </div>
      </h1>
    </>
  );
}

export default function App() {
  // Start on landing immediately — never show a blank screen
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'superadmin' | 'saccoadmin' | 'member'>('landing');

  // On mount, check if there is an existing Supabase session (only if configured)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return; // Stay on landing

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentPage(profile.role as any);
        }
      } catch {
        // Stay on landing
      }
    };

    checkSession();

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setCurrentPage('landing');
        }
      });
      return () => subscription.unsubscribe();
    } catch {
      // Ignore
    }
  }, []);

  const handleLogin = (role: string) => {
    setCurrentPage(role as any);
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    setCurrentPage('landing');
  };

  if (currentPage === 'login') {
    return <Login onBack={() => setCurrentPage('landing')} onLogin={handleLogin} />;
  }

  if (currentPage === 'superadmin') return <AdminDashboard onLogout={handleLogout} />;
  if (currentPage === 'saccoadmin') return <SaccoAdminDashboard onLogout={handleLogout} />;
  if (currentPage === 'member') return <MemberDashboard onLogout={handleLogout} />;

  return (
    <div className="page">
      <header className="nav">
        <div className="logo">SaccoFlow</div>
        <nav className="nav-links">
          <a href="#platform">Platform</a>
          <a href="#workflow">Workflow</a>
          <a href="#impact">Impact</a>
          <a href="#security">Security</a>
        </nav>
        <div className="nav-cta">
          <div className="social-icons">
            <a href="https://www.linkedin.com/company/sacco-flow/" className="social-icon" title="LinkedIn" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24"><path d="M20 3H4c-.6 0-1 .4-1 1v16c0 .6.4 1 1 1h16c.6 0 1-.4 1-1V4c0-.6-.4-1-1-1zM9 17H6v-8h3v8zm-1.5-9c-1 0-1.7-.7-1.7-1.7 0-1 .7-1.7 1.7-1.7 1 0 1.7.7 1.7 1.7 0 1-.7 1.7-1.7 1.7zm12 9h-3v-4c0-.9 0-2-1.2-2-1.2 0-1.4.9-1.4 1.8v4.2h-3v-8h2.8v1.1h.1c.4-.7 1.3-1.4 2.7-1.4 2.8 0 3.3 1.9 3.3 4.3v4z" /></svg>
            </a>
            <a href="https://www.instagram.com/saccoflow/" className="social-icon" title="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.057-1.645.069-4.849.069-3.205 0-3.584-.012-4.849-.069-3.259-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.015-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12c0-3.403 2.759-6.162 6.162-6.162 3.403 0 6.162 2.759 6.162 6.162 0 3.403-2.759 6.162-6.162 6.162-3.403 0-6.162-2.759-6.162-6.162zm2.889 0c0 1.861 1.511 3.372 3.372 3.372 1.861 0 3.372-1.511 3.372-3.372 0-1.861-1.511-3.372-3.372-3.372-1.861 0-3.372 1.511-3.372 3.372zm11.322-5.378c0 .795.645 1.44 1.44 1.44.795 0 1.44-.645 1.44-1.44 0-.795-.645-1.44-1.44-1.44-.795 0-1.44.645-1.44 1.44z" /></svg>
            </a>
            <a href="https://x.com/SaccoFlow" className="social-icon" title="X (formerly Twitter)" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.627l-5.1-6.658-5.712 6.658H2.562l7.746-8.973L1.54 2.25h6.798l4.882 6.268L18.244 2.25zM17.474 20.451h1.829L6.75 3.75H4.823l12.651 16.701z" /></svg>
            </a>
          </div>
          <button className="btn ghost login-outline" onClick={() => setCurrentPage('login')}>Login</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <div className="pill reveal">Digital-first SACCO management system</div>
            {/* Animated responsive headline */}
            <AnimatedHeadline />
            <p className="reveal delay-2">
              SaccoFlow replaces fragmented records with a single digital flow for members,
              loans, savings, and compliance. Move faster, reduce risk, and give members
              instant visibility into their financial future.
            </p>
            <div className="hero-actions reveal delay-3">
              <a href="https://wa.me/+256758435163" target="_blank" rel="noopener noreferrer" className="btn primary">
                Book your free consultation
                <span className="cta-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M5 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </a>
            </div>
            <div className="hero-trust reveal delay-4">
              <span>Designed for low-bandwidth environments</span>
              <span>Audit-ready reporting</span>
              <span>Role-based approvals</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="circle-card float reveal delay-1">
              <h2>Did you know?</h2>
              <p>
                SACCOs fuel financial inclusion for millions, yet many still rely on manual
                records and disconnected workflows. That analogue bottleneck slows service,
                increases fraud risk, and makes compliance painful.
              </p>
            </div>
            <div className="solution-card reveal delay-3">
              <p>
                SaccoFlow turns traditional cooperatives into digital-first SACCOs. We
                eliminate paperwork, automate compliance, and give members instant access
                to credit with complete transparency.
              </p>
              <div className="tag-row">
                <span>Paperless</span>
                <span>Compliant</span>
                <span>Member-first</span>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="section">
          <div className="section-header">
            <h2>Everything a SACCO needs, in one flow.</h2>
            <p>
              Purpose-built modules for operations teams, branch managers, and members —
              unified in a single system.
            </p>
          </div>
          <div className="platform-layout">
            <div className="platform-summary">
              <span className="platform-eyebrow">Six core modules</span>
              <h3>Modern operations with a single source of truth.</h3>
              <p>
                Replace fragmented records with one connected workflow — from onboarding
                to reporting. Each module is designed to be fast, auditable, and easy for
                teams to adopt.
              </p>
              <div className="platform-stats">
                <div className="platform-stat">
                  <strong>06</strong>
                  <span>Core modules</span>
                </div>
                <div className="platform-stat">
                  <strong>1</strong>
                  <span>Unified ledger</span>
                </div>
                <div className="platform-stat">
                  <strong>24/7</strong>
                  <span>Member visibility</span>
                </div>
              </div>
            </div>
            <div className="platform-list">
              {features.map((feature, index) => (
                <div key={feature.title} className="platform-item">
                  <div className="platform-index">0{index + 1}</div>
                  <div>
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="section split">
          <div className="split-card">
            <h2>Move from manual to modern in three steps.</h2>
            <p>
              Our onboarding team migrates data, sets up workflows, and trains staff so your
              SACCO can go live quickly without disruption.
            </p>
            <button className="btn outline">See implementation plan</button>
          </div>
          <div className="flow-list">
            {flowSteps.map((step, index) => (
              <div key={step.title} className="flow-item">
                <div className="flow-index">0{index + 1}</div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="impact" className="section">
          <div className="section-header">
            <h2>Impact that members feel immediately.</h2>
            <p>
              SaccoFlow removes friction from cooperative finance and makes services easy
              to understand for every member.
            </p>
          </div>
          <div className="outcome-grid">
            {outcomes.map((outcome) => (
              <div key={outcome.label} className="outcome-card">
                <h3>{outcome.label}</h3>
                <p>{outcome.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="security" className="section spotlight">
          <div>
            <h2>Built with transparency and trust at the core.</h2>
            <p>
              Every action is logged, approval trails are enforced, and reporting stays
              consistent across teams and branches. Your SACCO gains credibility with
              regulators and confidence with members.
            </p>
            <div className="spotlight-tags">
              <span>Audit trails</span>
              <span>Maker-checker</span>
              <span>Secure access</span>
              <span>Regulator-ready</span>
            </div>
          </div>
          <div className="spotlight-panel">
            <h3>Analytics you can trust</h3>
            <p>
              Dashboards highlight portfolio health, savings growth, and delinquency trends
              so leaders can act with clarity.
            </p>
            <div className="mini-stats">
              <div>
                <span>Portfolio health</span>
                <strong>Clear, real-time visibility</strong>
              </div>
              <div>
                <span>Member growth</span>
                <strong>Track adoption with ease</strong>
              </div>
              <div>
                <span>Compliance</span>
                <strong>Always report-ready</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div>
            <h2>Ready to modernize your SACCO?</h2>
            <p>
              Let us show you how SaccoFlow turns cooperative finance into a digital-first
              experience for staff and members.
            </p>
          </div>
          <div className="cta-actions">
            <a href="https://wa.me/+256758435163" target="_blank" rel="noopener noreferrer" className="btn primary">Book a demo</a>
            <a href="https://wa.me/+256758435163" target="_blank" rel="noopener noreferrer" className="btn ghost">Talk to our team</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <div className="logo">SaccoFlow</div>
          <p>Digital-first SACCO platform for transparent, compliant growth.</p>
        </div>
        <div className="footer-links">
          <a href="#platform">Platform</a>
          <a href="#workflow">Implementation</a>
          <a href="#impact">Impact</a>
          <a href="#security">Security</a>
        </div>
        <div className="footer-social">
          <a href="https://www.linkedin.com/company/sacco-flow/" className="social-icon" title="LinkedIn" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24"><path d="M20 3H4c-.6 0-1 .4-1 1v16c0 .6.4 1 1 1h16c.6 0 1-.4 1-1V4c0-.6-.4-1-1-1zM9 17H6v-8h3v8zm-1.5-9c-1 0-1.7-.7-1.7-1.7 0-1 .7-1.7 1.7-1.7 1 0 1.7.7 1.7 1.7 0 1-.7 1.7-1.7 1.7zm12 9h-3v-4c0-.9 0-2-1.2-2-1.2 0-1.4.9-1.4 1.8v4.2h-3v-8h2.8v1.1h.1c.4-.7 1.3-1.4 2.7-1.4 2.8 0 3.3 1.9 3.3 4.3v4z" /></svg>
          </a>
          <a href="https://www.instagram.com/saccoflow/" className="social-icon" title="Instagram" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.057-1.645.069-4.849.069-3.205 0-3.584-.012-4.849-.069-3.259-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.015-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12c0-3.403 2.759-6.162 6.162-6.162 3.403 0 6.162 2.759 6.162 6.162 0 3.403-2.759 6.162-6.162 6.162-3.403 0-6.162-2.759-6.162-6.162zm2.889 0c0 1.861 1.511 3.372 3.372 3.372 1.861 0 3.372-1.511 3.372-3.372 0-1.861-1.511-3.372-3.372-3.372-1.861 0-3.372 1.511-3.372 3.372zm11.322-5.378c0 .795.645 1.44 1.44 1.44.795 0 1.44-.645 1.44-1.44 0-.795-.645-1.44-1.44-1.44-.795 0-1.44.645-1.44 1.44z" /></svg>
          </a>
          <a href="https://x.com/SaccoFlow" className="social-icon" title="X (formerly Twitter)" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.627l-5.1-6.658-5.712 6.658H2.562l7.746-8.973L1.54 2.25h6.798l4.882 6.268L18.244 2.25zM17.474 20.451h1.829L6.75 3.75H4.823l12.651 16.701z" /></svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
