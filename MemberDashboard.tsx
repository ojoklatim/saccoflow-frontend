import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
    Home, CreditCard, ArrowRightLeft, Bell, LogOut, Filter, Menu, X
} from 'lucide-react';
import './dashboard.css';

interface MemberDashboardProps {
    onLogout: () => void;
}

interface Transaction {
    id: string;
    type: 'Deposit' | 'Withdrawal' | 'Loan';
    amount: number;
    transaction_date: string;
    note: string;
}

interface LoanRequest {
    id: string;
    amount: number;
    purpose: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    applied_on: string;
    repayment_date: string;
}

interface Reminder {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

export default function MemberDashboard({ onLogout }: MemberDashboardProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const [showReminders, setShowReminders] = useState(false);

    // Auth & Org context
    const [userId, setUserId] = useState<string | null>(null);
    const [saccoId, setSaccoId] = useState<string | null>(null);
    const [orgName, setOrgName] = useState("Loading Sacco...");
    const [userProfile, setUserProfile] = useState<any>(null);

    // Data state
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loans, setLoans] = useState<LoanRequest[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [savingsBalance, setSavingsBalance] = useState(0);
    const [outstandingLoan, setOutstandingLoan] = useState(0);

    // Form state
    const [loanForm, setLoanForm] = useState({ amount: '', purpose: '', repaymentDate: '' });
    const [loanSuccess, setLoanSuccess] = useState(false);
    const [loanLoading, setLoanLoading] = useState(false);

    // Filter state
    const [txnDateFrom, setTxnDateFrom] = useState('');
    const [txnDateTo, setTxnDateTo] = useState('');

    useEffect(() => {
        loadMemberData();
    }, []);

    const loadMemberData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Fetch Profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            setUserProfile(profile);
            setSaccoId(profile.sacco_id);

            // Fetch Sacco Name
            const { data: saccoData } = await supabase.from('saccos').select('name').eq('id', profile.sacco_id).single();
            if (saccoData) setOrgName(saccoData.name);

            // Fetch Dashboard Stats (SQL View)
            const { data: stats } = await supabase.from('member_dashboard_stats').select('*').eq('member_id', user.id).single();
            if (stats) {
                setSavingsBalance(stats.savings_balance || 0);
                setOutstandingLoan(stats.outstanding_loan_amount || 0);
            }

            // Fetch Transactions
            const { data: txns } = await supabase.from('transactions')
                .select('*')
                .eq('member_id', user.id)
                .order('transaction_date', { ascending: false });
            if (txns) setTransactions(txns as any);

            // Fetch Loans
            const { data: loanData } = await supabase.from('loans')
                .select('*')
                .eq('member_id', user.id)
                .order('applied_on', { ascending: false });
            if (loanData) setLoans(loanData as any);

            // Fetch Reminders
            const { data: remData } = await supabase.from('reminders')
                .select('*')
                .eq('sacco_id', profile.sacco_id)
                .order('created_at', { ascending: false });
            if (remData) setReminders(remData as any);
        }
    };

    const handleLoanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loanForm.amount || !loanForm.purpose || !loanForm.repaymentDate || !saccoId) return;

        setLoanLoading(true);
        const { error } = await supabase.from('loans').insert([{
            sacco_id: saccoId,
            member_id: userId,
            amount: Number(loanForm.amount),
            purpose: loanForm.purpose,
            repayment_date: loanForm.repaymentDate,
            status: 'Pending'
        }]);

        setLoanLoading(false);

        if (error) {
            alert("Error requesting loan: " + error.message);
            return;
        }

        setLoanSuccess(true);
        loadMemberData(); // Refresh Data

        setTimeout(() => {
            setLoanSuccess(false);
            setActiveTab('home');
            setLoanForm({ amount: '', purpose: '', repaymentDate: '' });
        }, 2000);
    };

    const handleLogoutClick = async () => {
        await supabase.auth.signOut();
        onLogout();
    };

    const filteredTxns = transactions.filter(t => {
        if (txnDateFrom && t.transaction_date < txnDateFrom) return false;
        if (txnDateTo && t.transaction_date > txnDateTo) return false;
        return true;
    });

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <>
                        <div className="dash-metrics-grid">
                            <div className="metric-card">
                                <div className="metric-label">Savings Balance</div>
                                <div className="metric-value">UGX {savingsBalance.toLocaleString()}</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Outstanding Loan</div>
                                <div className="metric-value">UGX {outstandingLoan.toLocaleString()}</div>
                                {loans.find(l => l.status === 'Approved') && (
                                    <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#e53e3e', fontWeight: 600 }}>
                                        Next Deadline: {loans
                                            .filter(l => l.status === 'Approved')
                                            .sort((a, b) => a.repayment_date.localeCompare(b.repayment_date))[0].repayment_date}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="dash-section-header" style={{ marginTop: '24px' }}>
                            <h2>Need financing?</h2>
                        </div>
                        <button className="btn-dark" onClick={() => setActiveTab('loans')}>Request a Loan</button>

                        <div className="dash-section-header" style={{ marginTop: '40px' }}>
                            <h2>Recent Transactions</h2>
                            <span className="action-link" onClick={() => setActiveTab('transactions')}>View More</span>
                        </div>
                        <div className="dash-table-wrapper">
                            {transactions.length === 0 ? (
                                <div className="dash-empty-state"><ArrowRightLeft size={48} strokeWidth={1.5} /><p>No transactions found.</p></div>
                            ) : (
                                <table className="dash-table">
                                    <thead><tr><th>Type</th><th>Amount (UGX)</th><th>Date</th><th>Note</th></tr></thead>
                                    <tbody>
                                        {transactions.slice(0, 5).map(t => (
                                            <tr key={t.id}>
                                                <td><span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', background: t.type === 'Deposit' ? '#e6f4ea' : '#fce8e8', color: t.type === 'Deposit' ? '#2d7a47' : '#c53030' }}>{t.type}</span></td>
                                                <td>{t.amount.toLocaleString()}</td>
                                                <td>{t.transaction_date}</td>
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
                    <div className="metric-card" style={{ maxWidth: '700px' }}>
                        {loanSuccess ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ color: '#2d7a47', fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>✓ Application Submitted!</div>
                                <p style={{ color: '#718096' }}>Your loan request has been sent for review.</p>
                            </div>
                        ) : (
                            <>
                                <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1.4rem', marginBottom: '8px' }}>Loan Application Form</h2>
                                <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '24px' }}>Please fill out all sections before submitting.</p>

                                <form onSubmit={handleLoanSubmit}>
                                    <h4 style={{ marginBottom: '16px', color: '#1a1f36' }}>Personal Information</h4>
                                    <div className="form-grid">
                                        <div><label className="label-field">Full Name</label><input className="input-field" value={userProfile?.full_name || ''} readOnly disabled /></div>
                                        <div><label className="label-field">Phone Number</label><input type="tel" className="input-field" value={userProfile?.phone || ''} readOnly disabled /></div>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: '1px solid #e3e8ee', margin: '32px 0' }} />
                                    <h4 style={{ marginBottom: '16px', color: '#1a1f36' }}>Loan Details</h4>
                                    <div className="form-grid">
                                        <div><label className="label-field">Desired Loan Amount (UGX) *</label><input type="number" className="input-field" placeholder="0" required value={loanForm.amount} onChange={e => setLoanForm({ ...loanForm, amount: e.target.value })} disabled={loanLoading} /></div>
                                        <div><label className="label-field">Repayment Deadline *</label>
                                            <input
                                                type="date"
                                                className="input-field"
                                                required
                                                min={new Date().toISOString().split('T')[0]}
                                                value={loanForm.repaymentDate}
                                                onChange={e => setLoanForm({ ...loanForm, repaymentDate: e.target.value })}
                                                disabled={loanLoading}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}><label className="label-field">Loan Purpose *</label><textarea className="input-field" rows={3} placeholder="E.g. Business expansion, school fees..." required value={loanForm.purpose} onChange={e => setLoanForm({ ...loanForm, purpose: e.target.value })} disabled={loanLoading} /></div>
                                    </div>

                                    <button type="submit" className="btn-dark" style={{ marginTop: '32px', width: '100%', justifyContent: 'center' }} disabled={loanLoading}>{loanLoading ? 'Submitting...' : 'Submit Application'}</button>
                                </form>
                            </>
                        )}

                        <div className="dash-section-header" style={{ marginTop: '40px' }}>
                            <h2>My Loan Applications</h2>
                        </div>
                        <div className="dash-table-wrapper">
                            {loans.length === 0 ? (
                                <div className="dash-empty-state"><CreditCard size={48} strokeWidth={1.5} /><p>No loan applications found.</p></div>
                            ) : (
                                <table className="dash-table">
                                    <thead><tr><th>Amount (UGX)</th><th>Applied On</th><th>Due Date</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {loans.map(l => (
                                            <tr key={l.id}>
                                                <td>{l.amount.toLocaleString()}</td>
                                                <td>{l.applied_on}</td>
                                                <td>{l.repayment_date}</td>
                                                <td><span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', background: l.status === 'Approved' ? '#e6f4ea' : l.status === 'Rejected' ? '#fce8e8' : '#fef9e7', color: l.status === 'Approved' ? '#2d7a47' : l.status === 'Rejected' ? '#c53030' : '#92610a' }}>{l.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                );
            case 'transactions':
                return (
                    <>
                        <div className="dash-section-header">
                            <h2>My Transactions</h2>
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
                                <div className="dash-empty-state"><ArrowRightLeft size={48} strokeWidth={1.5} /><p>No transaction history found matching filters.</p></div>
                            ) : (
                                <table className="dash-table">
                                    <thead><tr><th>Type</th><th>Amount (UGX)</th><th>Date</th><th>Note</th></tr></thead>
                                    <tbody>
                                        {filteredTxns.map(t => (
                                            <tr key={t.id}>
                                                <td><span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', background: t.type === 'Deposit' ? '#e6f4ea' : '#fce8e8', color: t.type === 'Deposit' ? '#2d7a47' : '#c53030' }}>{t.type}</span></td>
                                                <td>{t.amount.toLocaleString()}</td>
                                                <td>{t.transaction_date}</td>
                                                <td>{t.note || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
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
                    <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); setSidebarOpen(false); }}>
                        <Home size={20} /> Dashboard
                    </div>
                    <div className={`nav-item ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => { setActiveTab('loans'); setSidebarOpen(false); }}>
                        <CreditCard size={20} /> Loans
                    </div>
                    <div className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => { setActiveTab('transactions'); setSidebarOpen(false); }}>
                        <ArrowRightLeft size={20} /> Transactions
                    </div>
                </div>
                <div style={{ padding: '16px', borderTop: '1px solid #e3e8ee' }}>
                    <button className="nav-item nav-logout" style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }} onClick={handleLogoutClick}>
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </div>

            <div className="dash-main" onClick={() => sidebarOpen && setSidebarOpen(false)}>
                <div className="dash-header-bar">
                    <div className="dash-header-left" style={{ display: 'flex', alignItems: 'center' }}>
                        {!sidebarOpen && <button className="btn-icon" style={{ marginRight: '16px' }} onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}><Menu size={18} /></button>}
                    </div>
                    <div className="dash-header-center">
                        <div className="dash-header-title">{orgName}</div>
                    </div>
                    <div className="dash-header-actions" style={{ position: 'relative' }}>
                        <button
                            className="btn-icon"
                            title="Reminders"
                            onClick={(e) => { e.stopPropagation(); setShowReminders(!showReminders); }}
                            style={{ position: 'relative' }}
                        >
                            <Bell size={18} />
                            {reminders.length > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: 'red', color: 'white', fontSize: '10px', borderRadius: '50%', padding: '2px 5px' }}>{reminders.length}</span>}
                        </button>

                        {showReminders && (
                            <div className="reminders-dropdown" onClick={e => e.stopPropagation()}>
                                <div className="dropdown-header">
                                    <span>Notifications</span>
                                    <button className="btn-icon" style={{ border: 'none' }} onClick={() => setShowReminders(false)}><X size={14} /></button>
                                </div>
                                <div className="dropdown-body">
                                    {reminders.map(r => (
                                        <div key={r.id} className="reminder-item">
                                            <div className="reminder-title">{r.title}</div>
                                            <div className="reminder-msg">{r.message}</div>
                                            <div className="reminder-date">{new Date(r.created_at).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                    {reminders.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#a0aec0' }}>No new reminders.</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="dash-content">
                    <div style={{ marginBottom: '24px', fontSize: '1.2rem', color: '#4a5568' }}>Welcome back, <strong>{userProfile?.full_name}</strong></div>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
