import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import './index.css';

export default function ResetPassword() {
    const [loading, setLoading] = useState(true);
    const [sessionExists, setSessionExists] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [msg, setMsg] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSessionExists(!!session);
            } catch (e) {
                setSessionExists(false);
            } finally {
                setLoading(false);
            }
        };
        check();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');
        if (!password || password.length < 8) return setMsg('Password must be at least 8 characters');
        if (password !== confirm) return setMsg('Passwords do not match');
        setSaving(true);

        try {
            // Update the user's password using the active session created by the reset link
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setMsg('✅ Password updated. You can now sign in with your new password.');
            // optionally sign out to force fresh login
            try { await supabase.auth.signOut(); } catch {}
        } catch (err: any) {
            setMsg('Error: ' + (err?.message || String(err)));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 24 }}>Checking reset link...</div>;

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <h2>Reset Your Password</h2>
                    {!sessionExists && (
                        <div style={{ padding: 12, background: '#fff7ed', color: '#92400e', borderRadius: 6, marginBottom: 12 }}>
                            This password reset link is not valid or has expired. Please request a new reset link from the login page.
                        </div>
                    )}

                    {msg && (
                        <div style={{ padding: 12, background: msg.startsWith('✅') ? '#dcfce7' : '#fee2e2', color: msg.startsWith('✅') ? '#166534' : '#b91c1c', borderRadius: 6, marginBottom: 12 }}>
                            {msg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label>New password</label>
                            <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} disabled={!sessionExists || saving} placeholder="At least 8 characters" />
                        </div>
                        <div className="form-group">
                            <label>Confirm password</label>
                            <input type="password" className="input-field" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={!sessionExists || saving} />
                        </div>

                        <button className="btn primary full-width" type="submit" disabled={!sessionExists || saving}>{saving ? 'Saving...' : 'Set new password'}</button>
                    </form>

                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                        <a href="/saccoflow-frontend/" style={{ color: '#0b5fff' }}>Back to login</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
