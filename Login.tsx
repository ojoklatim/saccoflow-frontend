import { useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import './index.css';

interface LoginProps {
    onBack: () => void;
    onLogin: (role: string, session?: any) => void;
}

export default function Login({ onBack, onLogin }: LoginProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [saccoCode, setSaccoCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Password recovery state
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryLoading, setRecoveryLoading] = useState(false);
    const [recoveryMsg, setRecoveryMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        if (!isSupabaseConfigured) {
            setErrorMsg('Supabase is not configured for this deployment. Please contact the site administrator.');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });

                if (error) throw error;

                if (data.session) {
                    // Fetch user profile to determine their dashboard role
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError) throw profileError;

                    onLogin(profile?.role || 'member', data.session);
                }
            } else {
                // Check if this email is a Sacco admin email
                let userRole = 'member';
                let saccoId: string | null = null;

                const { data: saccoData } = await supabase
                    .from('saccos')
                    .select('id')
                    .eq('email', email)
                    .single();

                if (saccoData) {
                    userRole = 'saccoadmin';
                    saccoId = saccoData.id;
                }

                // Sign up with appropriate role
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            sacco_code: saccoCode || null,
                            role: userRole,
                            sacco_id: saccoId // Include sacco_id if they're an admin
                        }
                    }
                });

                if (error) throw error;

                const messageText = userRole === 'saccoadmin'
                    ? 'Registration successful! You are now the admin for your Sacco.'
                    : 'Registration successful! If you provided a valid Sacco Code, your account is now linked. You can sign in.';
                
                alert(messageText);
                setIsLogin(true);
            }
        } catch (error: any) {
            setErrorMsg(error.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecoveryLoading(true);
        setRecoveryMsg('');

        if (!isSupabaseConfigured) {
            setRecoveryMsg('❌ Supabase is not configured. Contact administrator.');
            setRecoveryLoading(false);
            return;
        }

        if (!recoveryEmail.trim()) {
            setRecoveryMsg('❌ Please enter your email address.');
            setRecoveryLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
                redirectTo: `${window.location.origin}/saccoflow-frontend/#/reset-password`
            });

            if (error) throw error;

            setRecoveryMsg('✅ Recovery email sent! Check your inbox and follow the link to reset your password. If you don\'t see it, check your spam folder.');
            setRecoveryEmail('');
            setTimeout(() => {
                setShowRecovery(false);
                setRecoveryMsg('');
            }, 5000);
        } catch (error: any) {
            setRecoveryMsg('❌ ' + (error.message || 'Failed to send recovery email'));
        } finally {
            setRecoveryLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-header">
                <button className="btn ghost" onClick={onBack} disabled={loading}>
                    <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>←</span> Back
                </button>
                <div className="logo" style={{ color: '#fff' }}>SaccoFlow</div>
            </div>

            <div className="login-container">
                <div className="login-card reveal delay-1">
                    <h2>{isLogin ? 'Welcome back' : 'Create an account'}</h2>
                    <p>{isLogin ? 'Sign in to your SaccoFlow account' : 'Register securely using your Sacco Code'}</p>

                    {errorMsg && (
                        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        {!isLogin && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="fullName">Full Name</label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="saccoCode">Sacco Code (6-characters)</label>
                                    <input
                                        type="text"
                                        id="saccoCode"
                                        value={saccoCode}
                                        onChange={(e) => setSaccoCode(e.target.value)}
                                        placeholder="e.g. A3F8E1"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@domain.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label htmlFor="password">Password</label>
                                {isLogin && <button type="button" className="forgot-password" onClick={() => setShowRecovery(true)}>Forgot password?</button>}
                            </div>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter secure password"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" className="btn primary full-width" disabled={loading}>
                            {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Register')}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <button
                                className="action-link"
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: 'inherit', fontWeight: 600 }}
                                onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
                                disabled={loading}
                            >
                                {isLogin ? "Register with Code" : "Sign in"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Password Recovery Modal */}
            {showRecovery && (
                <div className="login-page" style={{ background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="login-card" style={{ maxWidth: '400px', width: '90%' }}>
                        <h2>Recover Your Password</h2>
                        <p>Enter your email address and we'll send you a link to reset your password.</p>

                        {recoveryMsg && (
                            <div style={{ 
                                padding: '12px', 
                                background: recoveryMsg.startsWith('✅') ? '#dcfce7' : '#fee2e2', 
                                color: recoveryMsg.startsWith('✅') ? '#166534' : '#b91c1c', 
                                borderRadius: '6px', 
                                marginBottom: '16px', 
                                fontSize: '0.9rem' 
                            }}>
                                {recoveryMsg}
                            </div>
                        )}

                        <form onSubmit={handlePasswordRecovery} className="login-form">
                            <div className="form-group">
                                <label htmlFor="recoveryEmail">Email Address</label>
                                <input
                                    type="email"
                                    id="recoveryEmail"
                                    value={recoveryEmail}
                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                    placeholder="name@domain.com"
                                    required
                                    disabled={recoveryLoading}
                                    autoFocus
                                />
                            </div>

                            <button type="submit" className="btn primary full-width" disabled={recoveryLoading}>
                                {recoveryLoading ? 'Sending...' : 'Send Recovery Link'}
                            </button>
                        </form>

                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                            <button 
                                className="action-link" 
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.9rem' }}
                                onClick={() => { setShowRecovery(false); setRecoveryMsg(''); }}
                                disabled={recoveryLoading}
                            >
                                Back to Login
                            </button>
                        </div>

                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#666' }}>
                            <p style={{ marginBottom: '8px' }}><strong>No email received?</strong></p>
                            <ul style={{ marginLeft: '16px', lineHeight: '1.6' }}>
                                <li>Check your spam/junk folder</li>
                                <li>Verify the email is correct</li>
                                <li>Wait a few minutes for delivery</li>
                                <li>Contact your Sacco admin for manual reset</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
