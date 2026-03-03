# Supabase Local Testing Guide

## Quick Start - Test Locally First

### 1. **Check Environment Variables**

Open browser DevTools by pressing `F12`, then:
- Go to **Console** tab
- You should see logs like:
```
Supabase Configuration Debug:
URL provided: true
Key provided: true
URL value: https://cuibyyzhstjmhvebscpc.supabase.co
Key length: 236
Supabase Configured: true
```

❌ **If you see `Configured: false`**, then environment variables aren't loading properly.

---

### 2. **To Run Locally**

```bash
cd /workspaces/saccoflow-frontend

# Make sure .env.local exists with:
# VITE_SUPABASE_URL=https://cuibyyzhstjmhvebscpc.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Install dependencies
npm ci

# Start dev server
npm run dev
```

The app will run on `http://localhost:5173/saccoflow-frontend/`

---

### 3. **Verify Supabase Database Schema**

Go to [Supabase Dashboard](https://app.supabase.com):
- Select your project
- Go to **SQL Editor**
- Click **New query**
- Paste entire contents of `schema.sql` from the project
- Click **Run**

---

### 4. **Create Test Sacco**

In Supabase SQL Editor, run:
```sql
INSERT INTO public.saccos (name, email, location) 
VALUES ('Test Sacco', 'admin@test.com', 'Test Location')
RETURNING id, sacco_code;
```

Save the returned `sacco_code`.

---

### 5. **Test Registration**

1. Go to `http://localhost:5173/saccoflow-frontend/`
2. Click **"Register with Code"**
3. Fill in:
   - **Full Name:** Test User
   - **Sacco Code:** (paste the code from step 4)
   - **Email:** test@example.com
   - **Password:** TestPassword123!

4. Click **Register**

---

### 6. **Troubleshooting**

| Issue | Solution |
|-------|----------|
| "Supabase not configured" | Check console logs (F12). Ensure `.env.local` has both URL and KEY |
| Registration fails with error | Check browser console for exact error message |
| "Invalid Sacco Code" | Make sure you're using the code from your test Sacco |
| Can't see profile after login | Check that `profiles` table exists in Supabase (run schema.sql) |

---

### 7. **For GitHub Pages Deployment**

Once working locally, the GitHub Actions will automatically:
1. Read secrets from **Settings → Secrets and variables → Actions**
2. Inject `SUPABASE_URL` and `SUPABASE_ANON_KEY` at build time
3. Deploy to `https://cm-xh19.github.io/saccoflow-frontend`

✅ Your GitHub secrets must match your local `.env` values!
