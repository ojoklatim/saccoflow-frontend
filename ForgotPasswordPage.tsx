import { useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import './index.css';

interface ForgotPasswordPageProps {
    onBack: () => void;
}

export default function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryLoading, setRecoveryLoading] = useState(false);
    const [recoveryMsg, setRecoveryMsg] = useState('');

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
                <button className="btn ghost" onClick={onBack} disabled={recoveryLoading}>
                    <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>←</span> Back
                </button>
                <div className="logo" style={{ color: '#fff' }}>SaccoFlow</div>
            </div>

            <div className="login-container">
                <div className="login-card reveal delay-1">
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
                            onClick={onBack}
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
        </div>
    );
}
