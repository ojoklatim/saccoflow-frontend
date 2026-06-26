import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabase';
import './index.css';

interface SignupPageProps {
    onBack: () => void;
    onGoToLogin: () => void;
}

export default function SignupPage({ onBack, onGoToLogin }: SignupPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [saccoCode, setSaccoCode] = useState('');
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
            // Sign up - the backend handle_new_user trigger will securely assign saccoadmin
            // if this email is in the sacco_admin_emails table for the given saccoCode.
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        sacco_code: saccoCode || null
                    }
                }
            });

            if (error) throw error;

            alert('Registration successful! If you provided a valid Sacco Code, your account is now linked. You can sign in.');
            onGoToLogin();
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
                    <h2>Create an account</h2>
                    <p>Register securely using your Sacco Code</p>

                    {errorMsg && (
                        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
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
                            <label htmlFor="password">Password</label>
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
                            {loading ? 'Processing...' : 'Register'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>
                            Already have an account?{' '}
                            <button
                                className="action-link"
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: 'inherit', fontWeight: 600 }}
                                onClick={onGoToLogin}
                                disabled={loading}
                            >
                                Sign in
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
