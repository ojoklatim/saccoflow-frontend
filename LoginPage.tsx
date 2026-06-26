import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabase';
import './index.css';

interface LoginPageProps {
    onBack: () => void;
    onLogin: (role: string, session?: any) => void;
    onGoToSignup: () => void;
    onForgotPassword: () => void;
}

export default function LoginPage({ onBack, onLogin, onGoToSignup, onForgotPassword }: LoginPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) throw error;

            if (data.session) {
                // Fetch user profile to determine their dashboard role
                // Using maybeSingle() to avoid "Cannot coerce..." error if trigger is slow
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .maybeSingle();

                if (profileError) throw profileError;

                if (!profile) {
                    setErrorMsg('Account not found');
                    setLoading(false);
                    return;
                }

                onLogin(profile.role, data.session);
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
                    <h2>Welcome back</h2>
                    <p>Sign in to your SaccoFlow account</p>

                    {errorMsg && (
                        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
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
                                <button type="button" className="forgot-password" onClick={onForgotPassword}>Forgot password?</button>
                            </div>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter secure password"
                                    required
                                    disabled={loading}
                                    style={{ paddingRight: '42px', width: '100%', boxSizing: 'border-box' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    disabled={loading}
                                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.5)', padding: 0, display: 'flex', alignItems: 'center' }}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn primary full-width" disabled={loading}>
                            {loading ? 'Processing...' : 'Sign in'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>
                            Don't have an account?{' '}
                            <button
                                className="action-link"
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: 'inherit', fontWeight: 600 }}
                                onClick={onGoToSignup}
                                disabled={loading}
                            >
                                Register with Code
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
