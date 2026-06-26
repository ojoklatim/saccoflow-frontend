-- 1. Function to completely delete a Sacco and all its members from auth.users
CREATE OR REPLACE FUNCTION delete_sacco(target_sacco_id UUID)
RETURNS void AS $$
BEGIN
    -- Verify the caller is a superadmin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin') THEN
        RAISE EXCEPTION 'Unauthorized: Only superadmins can delete a Sacco';
    END IF;

    -- Delete all users in this sacco from auth.users 
    -- (This cascades to public.profiles and deletes their data automatically)
    DELETE FROM auth.users WHERE id IN (SELECT id FROM public.profiles WHERE sacco_id = target_sacco_id);
    
    -- Delete the Sacco itself
    DELETE FROM public.saccos WHERE id = target_sacco_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to completely delete a member from auth.users
CREATE OR REPLACE FUNCTION delete_member(target_member_id UUID)
RETURNS void AS $$
DECLARE 
    v_sacco_id UUID;
BEGIN
    -- Get the sacco_id of the member we are trying to delete
    SELECT sacco_id INTO v_sacco_id FROM profiles WHERE id = target_member_id;
    
    -- Verify the caller is a saccoadmin for that specific Sacco
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'saccoadmin' AND sacco_id = v_sacco_id) THEN
        RAISE EXCEPTION 'Unauthorized: You can only delete members of your own Sacco';
    END IF;

    -- Prevent admins from deleting themselves via this function
    IF target_member_id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot delete your own admin account';
    END IF;

    -- Delete the user from auth.users (cascades to their profile, transactions, etc)
    DELETE FROM auth.users WHERE id = target_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
