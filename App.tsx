import './index.css';
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import AdminDashboard from './AdminDashboard';
import SaccoAdminDashboard from './SaccoAdminDashboard';
import MemberDashboard from './MemberDashboard';
import ResetPassword from './ResetPassword';

type Page = 'landing' | 'login' | 'signup' | 'forgot-password' | 'superadmin' | 'saccoadmin' | 'member' | 'reset';

/** Map URL path → page key */
function pathToPage(path: string): Page | null {
  if (path === '/' || path === '') return 'landing';
  if (path === '/login') return 'login';
  if (path === '/signup') return 'signup';
  if (path === '/forgot-password') return 'forgot-password';
  return null; // unknown path → let session check decide
}

/** Map page key → URL path (only for public pages) */
function pageToPath(page: Page): string | null {
  const map: Partial<Record<Page, string>> = {
    landing: '/',
    login: '/login',
    signup: '/signup',
    'forgot-password': '/forgot-password',
  };
  return map[page] ?? null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    // Check for reset-password hash first
    if (window.location.hash?.includes('reset-password')) return 'reset';
    return pathToPage(window.location.pathname) ?? 'landing';
  });

  // Keep the browser URL in sync whenever the page changes
  const navigate = (page: Page) => {
    const path = pageToPath(page);
    if (path && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPage(page);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPop = () => {
      const page = pathToPage(window.location.pathname);
      if (page) setCurrentPage(page);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // On mount, check for an existing Supabase session
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Reset-password link takes priority
    if (window.location.hash?.includes('reset-password')) {
      setCurrentPage('reset');
      return;
    }

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return; // Stay on current page

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentPage(profile.role as Page);
        }
      } catch {
        // Stay on current page
      }
    };

    checkSession();

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          navigate('landing');
        }
      });
      return () => subscription.unsubscribe();
    } catch {
      // Ignore
    }
  }, []);

  const handleLogin = (role: string) => {
    setCurrentPage(role as Page);
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    navigate('landing');
  };

  if (currentPage === 'login') {
    return (
      <LoginPage
        onBack={() => navigate('landing')}
        onLogin={handleLogin}
        onGoToSignup={() => navigate('signup')}
        onForgotPassword={() => navigate('forgot-password')}
      />
    );
  }

  if (currentPage === 'signup') {
    return (
      <SignupPage
        onBack={() => navigate('landing')}
        onGoToLogin={() => navigate('login')}
      />
    );
  }

  if (currentPage === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onBack={() => navigate('login')}
      />
    );
  }

  if (currentPage === 'reset') return <ResetPassword />;

  if (currentPage === 'superadmin') return <AdminDashboard onLogout={handleLogout} />;
  if (currentPage === 'saccoadmin') return <SaccoAdminDashboard onLogout={handleLogout} />;
  if (currentPage === 'member') return <MemberDashboard onLogout={handleLogout} />;

  return <LandingPage onLoginClick={() => navigate('login')} />;
}
