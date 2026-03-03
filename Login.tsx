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
                // Sacco Code Registration logic (Option B)
                // This payload triggers the handle_new_user() SQL trigger on the backend
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            sacco_code: saccoCode || null,
                            role: 'member' // Default role for self-registration
                        }
                    }
                });

                if (error) throw error;

                alert('Registration successful! If you provided a valid Sacco Code, your account is now linked. You can sign in.');
                setIsLogin(true);
            }
        } catch (error: any) {
            setErrorMsg(error.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
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
                                {isLogin && <a href="#" className="forgot-password">Forgot password?</a>}
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
        </div>
    );
}
