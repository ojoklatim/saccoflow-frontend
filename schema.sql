-- ==========================================
-- SaccoFlow Complete Backend Schema
-- Designed for Supabase Free Tier & Mass Scalability
-- ==========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. Saccos Table (Multi-tenant Foundation)
-- ==========================================
CREATE TABLE saccos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL, -- Admin Email for recovery/contact
    location TEXT,
    -- Generates a 6-character unique alphanumeric Sacco Code (e.g. A3F8E1) for self-registration
    sacco_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 2. Profiles Table (Extends Supabase auth.users)
-- ==========================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'saccoadmin', 'member')),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    date_joined DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 3. Transactions Table (Savings & Withdrawals)
-- ==========================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Deposit', 'Withdrawal', 'Loan')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    note TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES profiles(id)
);

-- ==========================================
-- 4. Loans Table (Application & Dispatch)
-- ==========================================
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    repayment_date DATE NOT NULL,
    applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 5. Reminders Table (Member-Specific Notifications)
-- ==========================================
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
    member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 6. Audit Logs Table (Regulatory Tracking)
-- ==========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sacco_id UUID REFERENCES saccos(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 7. Automated Dashboard Views (Performance Optimized)
-- ==========================================

-- Admin: Superadmin Dashboard Stats
CREATE OR REPLACE VIEW superadmin_stats AS
SELECT 
    (SELECT COUNT(id) FROM saccos) AS total_saccos,
    (SELECT COUNT(id) FROM profiles) AS total_platform_users;

-- Admin: List Saccos with total member counts
CREATE OR REPLACE VIEW saccos_with_counts AS
SELECT 
    s.*,
    (SELECT COUNT(*) FROM profiles p WHERE p.sacco_id = s.id) AS users_count
FROM saccos s;

-- Sacco Admin: Dynamic Organization Dashboard Stats 
CREATE OR REPLACE VIEW sacco_dashboard_stats AS
SELECT 
    s.id AS sacco_id,
    (SELECT COUNT(*) FROM profiles p WHERE p.sacco_id = s.id AND p.role = 'member') AS total_members,
    (
        COALESCE((SELECT SUM(amount) FROM transactions WHERE sacco_id = s.id AND type = 'Deposit'), 0) -
        COALESCE((SELECT SUM(amount) FROM transactions WHERE sacco_id = s.id AND type = 'Withdrawal'), 0)
    ) AS total_savings,
    (SELECT COUNT(*) FROM loans WHERE sacco_id = s.id AND status = 'Approved') AS active_loans_count
FROM saccos s;

-- Member: Personal Live Balances
CREATE OR REPLACE VIEW member_dashboard_stats AS
SELECT 
    p.id AS member_id,
    p.sacco_id,
    (
        COALESCE((SELECT SUM(amount) FROM transactions WHERE member_id = p.id AND type = 'Deposit'), 0) -
        COALESCE((SELECT SUM(amount) FROM transactions WHERE member_id = p.id AND type = 'Withdrawal'), 0)
    ) AS savings_balance,
    COALESCE((SELECT SUM(amount) FROM loans WHERE member_id = p.id AND status = 'Approved'), 0) AS outstanding_loan_amount
FROM profiles p;


-- ==========================================
-- 8. Triggers (The Automatic Backend Engine)
-- ==========================================

-- TRIGGER A: Verify `sacco_code` and create custom user Profile upon Auth Signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_sacco_id UUID;
    v_role TEXT := 'member';
BEGIN
    -- Only validate sacco_code if they are signing up as a regular member (not superadmin or saccoadmin)
    IF NEW.raw_user_meta_data->>'role' = 'superadmin' THEN
        v_role := 'superadmin';
    ELSIF NEW.raw_user_meta_data->>'role' = 'saccoadmin' THEN
        v_role := 'saccoadmin';
        -- For sacco admins, the sacco_id should be assigned during creation by superadmin
        v_sacco_id := (NEW.raw_user_meta_data->>'sacco_id')::UUID;
    ELSE
        -- Default to member behavior using Sacco Code
        IF NEW.raw_user_meta_data->>'sacco_code' IS NOT NULL THEN
            SELECT id INTO v_sacco_id FROM saccos WHERE sacco_code = NEW.raw_user_meta_data->>'sacco_code' AND status = 'Active';
            IF v_sacco_id IS NULL THEN
                RAISE EXCEPTION 'Invalid or suspended Sacco Code';
            END IF;
        END IF;
    END IF;

    -- Sync to Profiles structure
    INSERT INTO public.profiles (id, sacco_id, role, full_name, phone, email)
    VALUES (
        NEW.id, 
        v_sacco_id, 
        v_role, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed User'),
        NEW.raw_user_meta_data->>'phone',
        NEW.email
    );

    -- Log secure action to Audit Logs automatically 
    IF v_sacco_id IS NOT NULL AND v_role = 'member' THEN
        INSERT INTO audit_logs (sacco_id, action, actor_id, details)
        VALUES (v_sacco_id, 'Member Self-Registered', NEW.id, 'Self-registered using Sacco Code: ' || (NEW.raw_user_meta_data->>'sacco_code'));
        
        -- Send a Welcome Reminder to the new member (member-specific)
        INSERT INTO reminders (sacco_id, member_id, title, message, sent_by)
        VALUES (v_sacco_id, NEW.id, 'Welcome to ' || (SELECT name FROM saccos WHERE id = v_sacco_id), 'We are glad to have you! Explore your dashboard.', NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow re-running script cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- TRIGGER B: Document all Transactions sequentially
CREATE OR REPLACE FUNCTION log_transaction_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (sacco_id, action, actor_id, details)
    VALUES (NEW.sacco_id, 'Transaction Recorded', NEW.created_by, 'Logged ' || NEW.type || ' of UGX ' || NEW.amount || ' for member ' || NEW.member_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_inserted ON transactions;
CREATE TRIGGER on_transaction_inserted
    AFTER INSERT ON transactions
    FOR EACH ROW EXECUTE PROCEDURE log_transaction_audit();

-- TRIGGER C: Log all Loan State events
CREATE OR REPLACE FUNCTION log_loan_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (sacco_id, action, actor_id, details)
        VALUES (NEW.sacco_id, 'Loan Requested', NEW.member_id, 'Requested UGX ' || NEW.amount || ' for ' || NEW.purpose);
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO public.audit_logs (sacco_id, action, actor_id, details)
        VALUES (NEW.sacco_id, 'Loan Status Updated', NEW.reviewed_by, 'Loan ' || NEW.id || ' status changed to ' || NEW.status);
        
        -- Optional: auto reminder for loan approval
        IF NEW.status = 'Approved' THEN
             INSERT INTO reminders (sacco_id, title, message, sent_by)
             VALUES (NEW.sacco_id, 'Loan Approved', 'Your loan of UGX ' || NEW.amount || ' has been approved. Repayment due: ' || NEW.repayment_date, NEW.reviewed_by);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_loan_changes ON loans;
CREATE TRIGGER on_loan_changes
    AFTER INSERT OR UPDATE ON loans
    FOR EACH ROW EXECUTE PROCEDURE log_loan_audit();

-- TRIGGER D: Log Sacco Generation
CREATE OR REPLACE FUNCTION log_sacco_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (sacco_id, action, details)
    VALUES (NEW.id, 'Sacco Created', 'Generated code: ' || NEW.sacco_code);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_sacco_created ON saccos;
CREATE TRIGGER on_sacco_created
    AFTER INSERT ON saccos
    FOR EACH ROW EXECUTE PROCEDURE log_sacco_audit();


-- ==========================================
-- 9. Complete Row Level Security (RLS) Policies
-- ==========================================
ALTER TABLE saccos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Saccos Isolation
DROP POLICY IF EXISTS "Superadmin views all Saccos" ON saccos;
CREATE POLICY "Superadmin views all Saccos" ON saccos FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'));

DROP POLICY IF EXISTS "Saccos visibility for own tenant" ON saccos;
CREATE POLICY "Saccos visibility for own tenant" ON saccos FOR SELECT USING (id = (SELECT sacco_id FROM profiles WHERE id = auth.uid()));

-- Profiles Isolation
DROP POLICY IF EXISTS "Superadmin views all profiles" ON profiles;
CREATE POLICY "Superadmin views all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'));

DROP POLICY IF EXISTS "Sacco admin views profiles in their sacco" ON profiles;
CREATE POLICY "Sacco admin views profiles in their sacco" ON profiles FOR ALL USING (EXISTS (SELECT 1 FROM profiles authed WHERE authed.id = auth.uid() AND authed.role = 'saccoadmin' AND authed.sacco_id = profiles.sacco_id));

DROP POLICY IF EXISTS "Members view own profile" ON profiles;
CREATE POLICY "Members view own profile" ON profiles FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Members can update own profile" ON profiles;
CREATE POLICY "Members can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Transactions Isolation
DROP POLICY IF EXISTS "Sacco admin full access to transactions" ON transactions;
CREATE POLICY "Sacco admin full access to transactions" ON transactions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'saccoadmin' AND sacco_id = transactions.sacco_id));

DROP POLICY IF EXISTS "Members view own transactions" ON transactions;
CREATE POLICY "Members view own transactions" ON transactions FOR SELECT USING (member_id = auth.uid());

-- Loans Isolation
DROP POLICY IF EXISTS "Sacco admin full access to loans" ON loans;
CREATE POLICY "Sacco admin full access to loans" ON loans FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'saccoadmin' AND sacco_id = loans.sacco_id));

DROP POLICY IF EXISTS "Members manage own loans" ON loans;
CREATE POLICY "Members manage own loans" ON loans FOR SELECT USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Members insert own loans" ON loans;
CREATE POLICY "Members insert own loans" ON loans FOR INSERT WITH CHECK (member_id = auth.uid());

-- Reminders Isolation
DROP POLICY IF EXISTS "Sacco admin manages reminders" ON reminders;
CREATE POLICY "Sacco admin manages reminders" ON reminders FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'saccoadmin' AND sacco_id = reminders.sacco_id));

DROP POLICY IF EXISTS "Members view own sacco reminders" ON reminders;
CREATE POLICY "Members view own sacco reminders" ON reminders FOR SELECT USING (sacco_id = (SELECT sacco_id FROM profiles WHERE id = auth.uid()));

-- Audit Logs Isolation
DROP POLICY IF EXISTS "Superadmin views all audit logs" ON audit_logs;
CREATE POLICY "Superadmin views all audit logs" ON audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'));

DROP POLICY IF EXISTS "Sacco admin views own audit logs" ON audit_logs;
CREATE POLICY "Sacco admin views own audit logs" ON audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'saccoadmin' AND sacco_id = audit_logs.sacco_id));
