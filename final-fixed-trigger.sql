CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_sacco_id UUID;
    v_role TEXT := 'member';
BEGIN
    IF NEW.raw_user_meta_data->>'role' = 'superadmin' THEN
        v_role := 'superadmin';
    ELSE
        IF NEW.raw_user_meta_data->>'sacco_code' IS NOT NULL THEN
            -- Prefix tables with public. or rely on search_path
            SELECT id INTO v_sacco_id FROM public.saccos 
            WHERE upper(sacco_code) = upper(NEW.raw_user_meta_data->>'sacco_code') 
            AND status = 'Active';
            
            IF v_sacco_id IS NULL THEN
                RAISE EXCEPTION 'Invalid or suspended Sacco Code';
            END IF;
            
            IF EXISTS (SELECT 1 FROM public.sacco_admin_emails WHERE sacco_id = v_sacco_id AND lower(email) = lower(NEW.email)) THEN
                v_role := 'saccoadmin';
            END IF;
        END IF;
    END IF;

    INSERT INTO public.profiles (id, sacco_id, role, full_name, phone, email)
    VALUES (
        NEW.id, 
        v_sacco_id, 
        v_role, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed User'),
        NEW.raw_user_meta_data->>'phone',
        NEW.email
    );

    IF v_sacco_id IS NOT NULL AND v_role = 'member' THEN
        INSERT INTO public.audit_logs (sacco_id, action, actor_id, details)
        VALUES (v_sacco_id, 'Member Self-Registered', NEW.id, 'Self-registered using Sacco Code: ' || upper(NEW.raw_user_meta_data->>'sacco_code'));
        
        INSERT INTO public.reminders (sacco_id, member_id, title, message, sent_by)
        VALUES (v_sacco_id, NEW.id, 'Welcome to ' || (SELECT name FROM public.saccos WHERE id = v_sacco_id), 'We are glad to have you! Explore your dashboard.', NEW.id);
    END IF;
    
    IF v_sacco_id IS NOT NULL AND v_role = 'saccoadmin' THEN
        INSERT INTO public.audit_logs (sacco_id, action, actor_id, details)
        VALUES (v_sacco_id, 'Admin Registered', NEW.id, 'Admin registered using Sacco Code: ' || upper(NEW.raw_user_meta_data->>'sacco_code'));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
