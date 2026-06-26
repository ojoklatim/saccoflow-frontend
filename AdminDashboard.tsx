import { useState, useEffect } from 'react';
import { Building2, Users, Plus, LogOut, Shield, Menu, X, Mail, Globe, Trash2 } from 'lucide-react';
import { supabase, formatSupabaseError } from './supabase';
import './dashboard.css';

interface AdminDashboardProps {
    onLogout: () => void;
}

interface Sacco {
    id: string; // UUID from DB
    name: string;
    email: string;
    location: string;
    status: 'Active' | 'Suspended';
    users_count: number;
    sacco_code: string;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [saccos, setSaccos] = useState<Sacco[]>([]);
    const [stats, setStats] = useState({ totalSaccos: 0, totalPlatformUsers: 0 });
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newSacco, setNewSacco] = useState({
        name: '',
        email: '',
        location: '',
        status: 'Active' as const
    });

    // Whitelist state variables
    const [showManageAdminsModal, setShowManageAdminsModal] = useState(false);
    const [selectedSaccoForAdmins, setSelectedSaccoForAdmins] = useState<Sacco | null>(null);
    const [adminEmails, setAdminEmails] = useState<string[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [loadingAdmins, setLoadingAdmins] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        // Fetch stats from view
        const { data: statsData } = await supabase.from('superadmin_stats').select('*').single();
        if (statsData) {
            setStats({
                totalSaccos: statsData.total_saccos || 0,
                totalPlatformUsers: statsData.total_platform_users || 0
            });
        }

        // Fetch saccos
        const { data: saccosData, error } = await supabase.from('saccos_with_counts').select('*').order('created_at', { ascending: false });
        if (saccosData) {
            setSaccos(saccosData as Sacco[]);
        } else if (error) {
            console.error("Error fetching saccos:", error);
        }
        setLoading(false);
    };

    const handleAddSacco = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSacco.name || !newSacco.email) return;

        // Insert into Supabase and request returned row to get its ID
        const { data, error } = await supabase.from('saccos').insert([
            {
                name: newSacco.name,
                email: newSacco.email,
                location: newSacco.location || null,
                status: newSacco.status
            }
        ]).select();

        if (error) {
            alert('Failed to add Sacco: ' + formatSupabaseError(error));
            return;
        }

        if (data && data.length > 0) {
            const createdSacco = data[0];
            // Whitelist primary email automatically in sacco_admin_emails
            const { error: emailError } = await supabase.from('sacco_admin_emails').insert([
                {
                    sacco_id: createdSacco.id,
                    email: newSacco.email.toLowerCase().trim()
                }
            ]);
            if (emailError) {
                console.error("Failed to whitelist primary admin email:", emailError);
            }
        }

        setNewSacco({ name: '', email: '', location: '', status: 'Active' });
        setShowAddModal(false);
        fetchDashboardData(); // Refresh table
    };

    // Fetch whitelisted emails for a Sacco
    const fetchSaccoAdmins = async (saccoId: string) => {
        setLoadingAdmins(true);
        const { data, error } = await supabase
            .from('sacco_admin_emails')
            .select('email')
            .eq('sacco_id', saccoId);
        if (data) {
            setAdminEmails(data.map(item => item.email));
        } else if (error) {
            console.error("Error fetching admin emails:", error);
        }
        setLoadingAdmins(false);
    };

    // Add extra admin email to whitelist
    const handleAddAdminEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSaccoForAdmins || !newAdminEmail) return;
        const emailToInsert = newAdminEmail.trim().toLowerCase();
        if (adminEmails.includes(emailToInsert)) {
            alert("Email is already whitelisted.");
            return;
        }
        const { error } = await supabase
            .from('sacco_admin_emails')
            .insert([{ sacco_id: selectedSaccoForAdmins.id, email: emailToInsert }]);
        if (error) {
            alert("Failed to whitelist admin email: " + formatSupabaseError(error));
        } else {
            setNewAdminEmail('');
            fetchSaccoAdmins(selectedSaccoForAdmins.id);
        }
    };

    // Remove email from whitelist
    const handleRemoveAdminEmail = async (emailToRemove: string) => {
        if (!selectedSaccoForAdmins) return;
        if (!window.confirm(`Are you sure you want to remove ${emailToRemove} from the admin whitelist?`)) return;
        const { error } = await supabase
            .from('sacco_admin_emails')
            .delete()
            .eq('sacco_id', selectedSaccoForAdmins.id)
            .eq('email', emailToRemove);
        if (error) {
            alert("Failed to remove admin email: " + formatSupabaseError(error));
        } else {
            fetchSaccoAdmins(selectedSaccoForAdmins.id);
        }
    };

    const deleteSacco = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this Sacco and all its data?")) return;

        const { error } = await supabase.from('saccos').delete().eq('id', id);
        if (error) {
            alert("Failed to delete: " + formatSupabaseError(error));
        } else {
            fetchDashboardData();
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
        const { error } = await supabase.from('saccos').update({ status: newStatus }).eq('id', id);

        if (error) {
            alert("Failed to update status: " + formatSupabaseError(error));
        } else {
            fetchDashboardData();
        }
    };

    const handleLogoutClick = async () => {
        await supabase.auth.signOut();
        onLogout();
    };

    return (
        <div className="dash-layout">
            {sidebarOpen && <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />}
            <div className={`dash-sidebar ${!sidebarOpen ? 'dash-sidebar-closed' : ''}`}>
                <div className="dash-logo-box">
                    <span className="dash-logo-text">SaccoFlow Admin</span>
                    <button className="btn-icon" onClick={() => setSidebarOpen(false)}><Menu size={18} /></button>
                </div>
                <div className="nav-menu">
                    <div className="nav-item active"><Shield size={20} /> Platform Overview</div>
                </div>
                <div style={{ padding: '16px', borderTop: '1px solid #e3e8ee' }}>
                    <button className="nav-item nav-logout" style={{ width: '100%', border: 'none', background: 'none' }} onClick={handleLogoutClick}>
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </div>

            <div className="dash-main">
                <div className="dash-header-bar">
                    <div className="dash-header-left">
                        {!sidebarOpen && <button className="btn-icon" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>}
                    </div>
                    <div className="dash-header-center">
                        <h2 className="dash-header-title">SaccoFlow</h2>
                    </div>
                </div>
                <div className="dash-content">
                    <div className="dash-metrics-grid">
                        <div className="metric-card">
                            <div className="metric-label">Registered SACCOs <Building2 size={20} color="#718096" /></div>
                            <div className="metric-value">{stats.totalSaccos}</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-label">Live Platform Users <Users size={20} color="#718096" /></div>
                            <div className="metric-value">{stats.totalPlatformUsers.toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="dash-section-header">
                        <h2>Sacco Organizations</h2>
                        <button className="btn-dark" onClick={() => setShowAddModal(true)}><Plus size={18} /> Add SACCO</button>
                    </div>

                    <div className="dash-table-wrapper">
                        {loading ? (
                            <div className="dash-empty-state"><p>Loading SECURE payload...</p></div>
                        ) : saccos.length === 0 ? (
                            <div className="dash-empty-state">
                                <Building2 size={48} strokeWidth={1.5} />
                                <p>No SACCOs registered on the platform yet.</p>
                            </div>
                        ) : (
                            <table className="dash-table">
                                <thead>
                                    <tr>
                                        <th>Organization</th>
                                        <th>Join Code</th>
                                        <th>Location</th>
                                        <th>Admin Email</th>
                                        <th>Users</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saccos.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1a56db' }}>{s.sacco_code}</td>
                                            <td>{s.location || '—'}</td>
                                            <td>{s.email}</td>
                                            <td>{s.users_count}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '999px',
                                                    fontSize: '0.8rem',
                                                    background: s.status === 'Active' ? '#e6f4ea' : '#fce8e8',
                                                    color: s.status === 'Active' ? '#2d7a47' : '#c53030',
                                                    fontWeight: 600
                                                }}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <button className="action-link" onClick={() => {
                                                        setSelectedSaccoForAdmins(s);
                                                        setShowManageAdminsModal(true);
                                                        fetchSaccoAdmins(s.id);
                                                    }}>
                                                        Admins
                                                    </button>
                                                    <button className="action-link" onClick={() => toggleStatus(s.id, s.status)}>
                                                        {s.status === 'Active' ? 'Suspend' : 'Activate'}
                                                    </button>
                                                    <button className="action-link" style={{ color: '#e53e3e' }} onClick={() => deleteSacco(s.id)}>
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Add SACCO Modal */}
            {showAddModal && (
                <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Register New SACCO</h3>
                            <button className="btn-icon" onClick={() => setShowAddModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddSacco}>
                            <div className="form-grid" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label className="label-field">SACCO Name *</label>
                                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                        <Building2 size={18} style={{ position: 'absolute', left: '12px', color: '#a0aec0' }} />
                                        <input
                                            className="input-field"
                                            style={{ paddingLeft: '40px' }}
                                            placeholder="e.g. Skyline Savings Group"
                                            required
                                            value={newSacco.name}
                                            onChange={e => setNewSacco({ ...newSacco, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="label-field">Admin Email *</label>
                                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                            <Mail size={18} style={{ position: 'absolute', left: '12px', color: '#a0aec0' }} />
                                            <input
                                                type="email"
                                                className="input-field"
                                                style={{ paddingLeft: '40px' }}
                                                placeholder="admin@sacco.com"
                                                required
                                                value={newSacco.email}
                                                onChange={e => setNewSacco({ ...newSacco, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label-field">Location</label>
                                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                            <Globe size={18} style={{ position: 'absolute', left: '12px', color: '#a0aec0' }} />
                                            <input
                                                className="input-field"
                                                style={{ paddingLeft: '40px' }}
                                                placeholder="e.g. Kampala"
                                                value={newSacco.location}
                                                onChange={e => setNewSacco({ ...newSacco, location: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-outline-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn-dark">Register SACCO</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Sacco Admins Whitelist Modal */}
            {showManageAdminsModal && selectedSaccoForAdmins && (
                <div className="modal-backdrop" onClick={() => setShowManageAdminsModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Manage Admins — {selectedSaccoForAdmins.name}</h3>
                            <button className="btn-icon" onClick={() => setShowManageAdminsModal(false)}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
                                Add or remove email addresses whitelisted to register as admins for this SACCO.
                            </p>

                            <form onSubmit={handleAddAdminEmail} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1 }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '12px', color: '#a0aec0' }} />
                                    <input
                                        type="email"
                                        className="input-field"
                                        style={{ paddingLeft: '40px', margin: 0 }}
                                        placeholder="admin-email@sacco.com"
                                        required
                                        value={newAdminEmail}
                                        onChange={e => setNewAdminEmail(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn-dark" style={{ whiteSpace: 'nowrap' }}>
                                    Add Admin
                                </button>
                            </form>

                            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e3e8ee', borderRadius: '6px' }}>
                                {loadingAdmins ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#718096' }}>Loading admins...</div>
                                ) : adminEmails.length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#718096' }}>No admins whitelisted yet.</div>
                                ) : (
                                    <table className="dash-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>Whitelisted Email</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adminEmails.map(email => (
                                                <tr key={email}>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{email}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button 
                                                            className="btn-icon" 
                                                            style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}
                                                            onClick={() => handleRemoveAdminEmail(email)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-dark" onClick={() => setShowManageAdminsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
