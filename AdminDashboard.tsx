import { useState, useEffect } from 'react';
import { Building2, Users, Plus, LogOut, Shield, Menu, X, Mail, Globe } from 'lucide-react';
import { supabase } from './supabase';
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

        // Insert into Supabase
        const { error } = await supabase.from('saccos').insert([
            {
                name: newSacco.name,
                email: newSacco.email,
                location: newSacco.location || null,
                status: newSacco.status
            }
        ]);

        if (error) {
            alert('Failed to add Sacco: ' + error.message);
            return;
        }

        setNewSacco({ name: '', email: '', location: '', status: 'Active' });
        setShowAddModal(false);
        fetchDashboardData(); // Refresh table
    };

    const deleteSacco = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this Sacco and all its data?")) return;

        const { error } = await supabase.from('saccos').delete().eq('id', id);
        if (error) {
            alert("Failed to delete: " + error.message);
        } else {
            fetchDashboardData();
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
        const { error } = await supabase.from('saccos').update({ status: newStatus }).eq('id', id);

        if (error) {
            alert("Failed to update status: " + error.message);
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
        </div>
    );
}
