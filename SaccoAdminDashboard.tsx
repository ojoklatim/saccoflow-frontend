import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
    LayoutDashboard, Users, ArrowRightLeft, CreditCard,
    FileText, ShieldAlert, LogOut, Bell, Menu, Plus, Search, Filter, Briefcase, X
} from 'lucide-react';
import './dashboard.css';

interface SaccoAdminProps { onLogout: () => void; }

interface Member {
    id: string; // UUID from Supabase profiles
    name: string;
    phone: string;
    email: string;
    status: 'Active' | 'Inactive';
    dateJoined: string;
}

interface Transaction {
    id: string;
    memberName: string;
    type: 'Deposit' | 'Withdrawal' | 'Loan';
    amount: number;
    date: string;
    note: string;
}

interface Loan {
    id: string;
    memberName: string;
    memberId: string;
    amount: number;
    purpose: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    date: string;
    repaymentDate: string;
}

interface AuditLog {
    id: string;
    action: string;
    user: string;
    date: string;
    details: string;
}

export default function SaccoAdminDashboard({ onLogout }: SaccoAdminProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [saccoName, setSaccoName] = useState('Loading Sacco...');

    // Auth context
    const [saccoId, setSaccoId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Data state
    const [members, setMembers] = useState<Member[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    // Stats state
    const [totalSavings, setTotalSavings] = useState(0);

    // Modal state
    const [showAddTxn, setShowAddTxn] = useState(false);
    const [txnForm, setTxnForm] = useState({ memberId: '', type: 'Deposit', amount: '', note: '' });

    const [showNotif, setShowNotif] = useState(false);
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [notifSent, setNotifSent] = useState(false);

    const [loading, setLoading] = useState(false);

    // Filter state
    const [memberSearch, setMemberSearch] = useState('');
    const [txnDateFrom, setTxnDateFrom] = useState('');
    const [txnDateTo, setTxnDateTo] = useState('');
    const [auditAction, setAuditAction] = useState('');
    const [auditDateFrom, setAuditDateFrom] = useState('');
    const [auditDateTo, setAuditDateTo] = useState('');

    useEffect(() => {
        loadAdminContext();
    }, []);

    const loadAdminContext = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: profile } = await supabase.from('profiles').select('sacco_id').eq('id', user.id).single();
        if (profile) {
            setSaccoId(profile.sacco_id);
            const { data: saccoData } = await supabase.from('saccos').select('name').eq('id', profile.sacco_id).single();
            if (saccoData) setSaccoName(saccoData.name);
            fetchSaccoData(profile.sacco_id);
        }
    };

    const fetchSaccoData = async (orgId: string) => {
        // Fetch Members
        const { data: mems } = await supabase.from('profiles').select('*').eq('sacco_id', orgId).eq('role', 'member');
        if (mems) {
            setMembers(mems.map((m: any) => ({
                id: m.id,
                name: m.full_name,
                phone: m.phone || '—',
                email: m.email || '—',
                status: m.status,
                dateJoined: m.date_joined
            })));
        }

        // Fetch Transactions with linked member names
        const { data: txns } = await supabase.from('transactions')
            .select('*, profiles!transactions_member_id_fkey(full_name)')
            .eq('sacco_id', orgId).order('transaction_date', { ascending: false });
        if (txns) {
            setTransactions(txns.map((t: any) => ({
                id: t.id,
                memberName: t.profiles?.full_name || 'Unknown',
                type: t.type,
                amount: t.amount,
                date: t.transaction_date,
                note: t.note
            })));
        }

        // Fetch Loans
        const { data: lns } = await supabase.from('loans')
            .select('*, profiles!loans_member_id_fkey(full_name)')
            .eq('sacco_id', orgId).order('applied_on', { ascending: false });
        if (lns) {
            setLoans(lns.map((l: any) => ({
                id: l.id,
                memberName: l.profiles?.full_name || 'Unknown',
                memberId: l.member_id,
                amount: l.amount,
                purpose: l.purpose,
                status: l.status,
                date: l.applied_on,
                repaymentDate: l.repayment_date
            })));
        }

        // Fetch Audit Logs
        const { data: audits } = await supabase.from('audit_logs')
            .select('*, profiles!audit_logs_actor_id_fkey(full_name)')
            .eq('sacco_id', orgId).order('created_at', { ascending: false });
        if (audits) {
            setAuditLogs(audits.map((a: any) => ({
                id: a.id,
                action: a.action,
                user: a.profiles?.full_name || 'System',
                date: new Date(a.created_at).toLocaleString(),
                details: a.details
            })));
        }

        // Fetch Total Savings via View
        const { data: stats } = await supabase.from('sacco_dashboard_stats').select('total_savings').eq('sacco_id', orgId).single();
        if (stats) setTotalSavings(stats.total_savings || 0);

        setLoading(false);
    };

    // ─── Transaction handlers ──────────────────────────────────
    async function saveTxn() {
        if (!txnForm.memberId || !txnForm.amount || !saccoId) return;

        const { error } = await supabase.from('transactions').insert([{
            sacco_id: saccoId,
            member_id: txnForm.memberId,
            type: txnForm.type,
            amount: Number(txnForm.amount),
            note: txnForm.note,
            created_by: userId
        }]);

        if (error) {
            alert('Failed to save transaction: ' + error.message);
            return;
        }

        setTxnForm({ memberId: '', type: 'Deposit', amount: '', note: '' });
        setShowAddTxn(false);
        if (saccoId) fetchSaccoData(saccoId);
    }

    // ─── Loan handlers ─────────────────────────────────────────
    async function updateLoanStatus(id: string, status: Loan['status']) {
        if (!saccoId) return;
        const { error } = await supabase.from('loans').update({
            status: status,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            alert("Error updating loan: " + error.message);
        } else {
            fetchSaccoData(saccoId);
        }
    }

    // ─── Notification handler ──────────────────────────────────
    async function sendNotif() {
        if (!notifTitle || !notifBody || !saccoId) return;

        setLoading(true);
        const { error } = await supabase.from('reminders').insert([{
            sacco_id: saccoId,
            title: notifTitle,
            message: notifBody,
            sent_by: userId
        }]);
        setLoading(false);

        if (error) {
            alert('Failed to send notification: ' + error.message);
            return;
        }

        setNotifSent(true);
        setTimeout(() => { setNotifSent(false); setNotifTitle(''); setNotifBody(''); setShowNotif(false); }, 2000);
    }

    const handleLogoutClick = async () => {
        await supabase.auth.signOut();
        onLogout();
    };

    // ─── Filters ────────────────────────────────────────────────
    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.phone.includes(memberSearch) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
    );

    const filteredTxns = transactions.filter(t => {
        if (txnDateFrom && t.date < txnDateFrom) return false;
        if (txnDateTo && t.date > txnDateTo) return false;
        return true;
    });

    const filteredAudit = auditLogs.filter(a => {
        if (auditAction && !a.action.toLowerCase().includes(auditAction.toLowerCase())) return false;
        // Basic date comparison (might need adjustment depending on specific locale format)
        if (auditDateFrom && a.date.split(',')[0] < auditDateFrom) return false;
        if (auditDateTo && a.date.split(',')[0] > auditDateTo) return false;
        return true;
    });

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'members', label: 'Members', icon: <Users size={20} /> },
        { id: 'transactions', label: 'Transactions', icon: <ArrowRightLeft size={20} /> },
        { id: 'loans', label: 'Loans', icon: <CreditCard size={20} /> },
        { id: 'reports', label: 'Reports', icon: <FileText size={20} /> },
        { id: 'audit', label: 'Audit Logs', icon: <ShieldAlert size={20} /> },
    ];

    const renderContent = () => {
        if (loading && members.length === 0) return <div>Loading SECURE payload...</div>;

        switch (activeTab) {
            case 'dashboard':
                return (
                    <>
                        <div className="dash-metrics-grid">
                            <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('members')}>
                                <div className="metric-label">Total Members <Users size={20} color="#718096" /></div>
                                <div className="metric-value">{members.length}</div>
                                <span className="action-link" style={{ fontSize: '0.85rem', marginTop: '12px', display: 'inline-block' }}>View Members →</span>
                            </div>
                            <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('transactions')}>
                                <div className="metric-label">Total Savings <ArrowRightLeft size={20} color="#718096" /></div>
                                <div className="metric-value">UGX {totalSavings.toLocaleString()}</div>
                                <span className="action-link" style={{ fontSize: '0.85rem', marginTop: '12px', display: 'inline-block' }}>View Transactions →</span>
                            </div>
                            <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('loans')}>
                                <div className="metric-label">Active Loans <Briefcase size={20} color="#718096" /></div>
                                <div className="metric-value">{loans.filter(l => l.status === 'Approved').length}</div>
                                <span className="action-link" style={{ fontSize: '0.85rem', marginTop: '12px', display: 'inline-block' }}>View Loans →</span>
                            </div>
                        </div>
                        <div className="dash-section-header"><h2>Quick Actions</h2></div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <button className="btn-dark" onClick={() => { setActiveTab('members'); }}><Plus size={18} /> View Members</button>
                            <button className="btn-dark" onClick={() => { setActiveTab('transactions'); setShowAddTxn(true); }}><Plus size={18} /> Record Transaction</button>
                            <button className="btn-dark" onClick={() => setActiveTab('loans')}><FileText size={18} /> Review Loan Apps</button>
                        </div>
                    </>
                );

            case 'members':
                return (
                    <>
                        <div className="dash-section-header">
                            <h2>Members Directory</h2>
                            <span style={{ fontSize: '0.9rem', color: '#718096' }}>Members register via the Sacco Code on the login page.</span>
                        </div>
                        <div className="filters-row">
                            <div className="search-bar">
                                <Search size={18} color="#a0aec0" />
                                <input type="text" placeholder="Search by name, phone, email…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="dash-table-wrapper">
                            {filteredMembers.length === 0 ? (
                                <div className="dash-empty-state"><Users size={48} strokeWidth={1.5} /><p>No members found.</p></div>
                            ) : (
                                <table className="dash-table">
                                    <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th><th>Date Joined</th></tr></thead>
                                    <tbody>
                                        {filteredMembers.map(m => (
                                            <tr key={m.id}>
                                                <td>{m.name}</td>
                                                <td>{m.phone}</td>
                                                <td>{m.email}</td>
                                                <td><span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', background: m.status === 'Active' ? '#e6f4ea' : '#fce8e8', color: m.status === 'Active' ? '#2d7a47' : '#c53030' }}>{m.status}</span></td>
                                                <td>{m.dateJoined}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                );

            case 'transactions':
                return (
                    <>
                        <div className="dash-section-header">
                            <h2>Transactions</h2>
                            <button className="btn-dark" onClick={() => setShowAddTxn(true)}><Plus size={18} /> Add Transaction</button>
                        </div>
                        <div className="filters-row" style={{ flexWrap: 'wrap' }}>
                            <Filter size={18} color="#718096" />
                            <span style={{ fontWeight: 600, color: '#4a5568', fontSize: '0.9rem' }}>Filter by Date:</span>
                            <input type="date" className="input-field" style={{ width: 'auto' }} value={txnDateFrom} onChange={e => setTxnDateFrom(e.target.value)} />
                            <span style={{ color: '#718096' }}>to</span>
                            <input type="date" className="input-field" style={{ width: 'auto' }} value={txnDateTo} onChange={e => setTxnDateTo(e.target.value)} />
                            {(txnDateFrom || txnDateTo) && <button className="action-link" onClick={() => { setTxnDateFrom(''); setTxnDateTo(''); }}>Clear</button>}
                        </div>
                        <div className="dash-table-wrapper">
                            {filteredTxns.length === 0 ? (
                                <div className="dash-empty-state"><ArrowRightLeft size={48} strokeWidth={1.5} /><p>No transactions match the filter.</p></div>
                            ) : (
                                <table className="dash-table">
                                    <thead><tr><th>Member</th><th>Type</th><th>Amount (UGX)</th><th>Date</th><th>Note</th></tr></thead>
                                    <tbody>
                                        {filteredTxns.map(t => (
                                            <tr key={t.id}>
                                                <td>{t.memberName}</td>
                                                <td><span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', background: t.type === 'Deposit' ? '#e6f4ea' : t.type === 'Loan' ? '#e8f0fe' : '#fce8e8', color: t.type === 'Deposit' ? '#2d7a47' : t.type === 'Loan' ? '#1a56db' : '#c53030' }}>{t.type}</span></td>
                                                <td>{t.amount.toLocaleString()}</td>
                                                <td>{t.date}</td>
                                                <td>{t.note || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                );

            case 'loans':
                return (
                    <>
                        <div className="dash-section-header"><h2>Loan Applications</h2></div>
                        <div className="dash-table-wrapper">
                            {loans.length === 0 ? (
                                <div className="dash-empty-state"><Briefcase size={48} strokeWidth={1.5} /><p>No loan applications yet.</p></div>
                            ) : (
                                <table className="dash-table">
                                    <thead><tr><th>Member</th><th>Amount (UGX)</th><th>Purpose</th><th>Applied On</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {loans.map(l => (
                                            <tr key={l.id}>
                                                <td>{l.memberName}</td>
                                                <td>{l.amount.toLocaleString()}</td>
                                                <td>{l.purpose}</td>
                                                <td>{l.date}</td>
                                                <td>{l.repaymentDate}</td>
                                                <td><span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', background: l.status === 'Approved' ? '#e6f4ea' : l.status === 'Rejected' ? '#fce8e8' : '#fef9e7', color: l.status === 'Approved' ? '#2d7a47' : l.status === 'Rejected' ? '#c53030' : '#92610a' }}>{l.status}</span></td>
                                                <td style={{ display: 'flex', gap: '8px' }}>
                                                    {l.status === 'Pending' && (<>
                                                        <button className="action-link" onClick={() => updateLoanStatus(l.id, 'Approved')}>Approve</button>
                                                        <button style={{ color: '#e53e3e', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600 }} onClick={() => updateLoanStatus(l.id, 'Rejected')}>Reject</button>
                                                    </>)}
                                                    {l.status !== 'Pending' && <span style={{ color: '#718096', fontSize: '0.85rem' }}>Reviewed</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                );

            case 'reports':
                return (
                    <div className="dash-empty-state"><FileText size={48} strokeWidth={1.5} /><p>Reporting module available via Backend Exports.</p></div>
                );

            case 'audit':
                return (
                    <>
                        <div className="dash-section-header"><h2>Audit Logs</h2></div>
                        <div className="filters-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
                            <Filter size={18} color="#718096" />
                            <select className="input-field" style={{ width: '180px' }} value={auditAction} onChange={e => setAuditAction(e.target.value)}>
                                <option value="">All Actions</option>
                                <option value="Login">Login</option>
                                <option value="Member Self-Registered">Member Self-Registered</option>
                                <option value="Transaction Recorded">Transaction Recorded</option>
                                <option value="Loan Requested">Loan Requested</option>
                                <option value="Loan Status Updated">Loan Status Updated</option>
                            </select>
                        </div>
                        <div className="dash-table-wrapper">
                            {filteredAudit.length === 0 ? (
                                <div className="dash-empty-state"><ShieldAlert size={48} strokeWidth={1.5} /><p>No audit logs match the filter.</p></div>
                            ) : (
                                <table className="dash-table">
                                    <thead><tr><th>Action</th><th>User</th><th>Date</th><th>Details</th></tr></thead>
                                    <tbody>{filteredAudit.map(a => (<tr key={a.id}><td>{a.action}</td><td>{a.user}</td><td>{a.date}</td><td>{a.details}</td></tr>))}</tbody>
                                </table>
                            )}
                        </div>
                    </>
                );

            default: return null;
        }
    };

    return (
        <div className="dash-layout">
            {sidebarOpen && <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />}
            <div className={`dash-sidebar ${!sidebarOpen ? 'dash-sidebar-closed' : ''}`}>
                <div className="dash-logo-box">
                    <span className="dash-logo-text">SaccoFlow</span>
                    <button className="btn-icon" onClick={() => setSidebarOpen(false)}><Menu size={18} /></button>
                </div>
                <div className="nav-menu">
                    {navItems.map(item => (
                        <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) setSidebarOpen(false); }}>
                            {item.icon} {item.label}
                        </div>
                    ))}
                </div>
                <div style={{ padding: '16px', borderTop: '1px solid #e3e8ee' }}>
                    <button className="nav-item nav-logout" style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }} onClick={handleLogoutClick}><LogOut size={20} /> Logout</button>
                </div>
            </div>

            <div className="dash-main">
                <div className="dash-header-bar">
                    <div className="dash-header-left">
                        {!sidebarOpen && <button className="btn-icon" style={{ flexShrink: 0 }} onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>}
                    </div>
                    <div className="dash-header-center">
                        <span className="dash-header-title">{saccoName} Admin</span>
                    </div>
                    <div className="dash-header-actions">
                        <button className="btn-icon" title="Send Global Notification" onClick={() => setShowNotif(true)}><Bell size={18} /></button>
                    </div>
                </div>
                <div className="dash-content">{renderContent()}</div>
            </div>

            {/* Add Transaction Modal */}
            {showAddTxn && (
                <div className="modal-backdrop" onClick={() => setShowAddTxn(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Transaction</h3>
                            <button className="btn-icon" onClick={() => setShowAddTxn(false)}><X size={18} /></button>
                        </div>
                        <div className="form-grid" style={{ gap: '16px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label-field">Member *</label>
                                <select className="input-field" value={txnForm.memberId} onChange={e => setTxnForm(f => ({ ...f, memberId: e.target.value }))}>
                                    <option value="">Select member…</option>
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                {members.length === 0 && <p style={{ color: '#718096', fontSize: '0.8rem', marginTop: '6px' }}>Members must register via Sacco Code first.</p>}
                            </div>
                            <div>
                                <label className="label-field">Transaction Type</label>
                                <select className="input-field" value={txnForm.type} onChange={e => setTxnForm(f => ({ ...f, type: e.target.value as Transaction['type'] }))}>
                                    <option value="Deposit">Deposit</option>
                                    <option value="Withdrawal">Withdrawal</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-field">Amount (UGX) *</label>
                                <input type="number" className="input-field" placeholder="0" value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label-field">Note (Optional)</label>
                                <input className="input-field" placeholder="Optional note…" value={txnForm.note} onChange={e => setTxnForm(f => ({ ...f, note: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-outline-cancel" onClick={() => setShowAddTxn(false)}>Cancel</button>
                            <button className="btn-dark" onClick={saveTxn}>Save Transaction</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Notification Modal */}
            {showNotif && (
                <div className="modal-backdrop" onClick={() => setShowNotif(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Send Notification to All Members</h3>
                            <button className="btn-icon" onClick={() => setShowNotif(false)}><X size={18} /></button>
                        </div>
                        {notifSent ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: '#2d7a47' }}>
                                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>✓ Notification sent to all members!</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div><label className="label-field">Title *</label><input className="input-field" placeholder="e.g. Upcoming AGM" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} /></div>
                                    <div><label className="label-field">Message *</label><textarea className="input-field" rows={4} placeholder="Type your message here…" value={notifBody} onChange={e => setNotifBody(e.target.value)} style={{ resize: 'vertical' }} /></div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn-outline-cancel" onClick={() => setShowNotif(false)}>Cancel</button>
                                    <button className="btn-dark" onClick={sendNotif} disabled={loading}><Bell size={16} /> Send to All Members</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
