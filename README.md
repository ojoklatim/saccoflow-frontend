# SaccoFlow — Digital-First SACCO Management Platform

SaccoFlow is a multi-tenant web application that helps Savings and Credit Cooperative Organizations (SACCOs) transition from manual paperwork to a fully digital-first management system. Built with **React + TypeScript + Vite** on the frontend and **Supabase (PostgreSQL)** on the backend.

---

## Features

| Dashboard        | Capabilities                                                           |
| ---------------- | ---------------------------------------------------------------------- |
| **Superadmin**   | Register SACCOs, view platform stats, suspend/activate organizations   |
| **Sacco Admin**  | Manage members, record transactions, approve/reject loans, send notifications, view audit logs |
| **Member**       | View savings balance, outstanding loans, recent transactions, apply for loans, receive notifications |

### Authentication — Sacco Code Self-Registration (Option B)
- Each SACCO gets a unique **6-character alphanumeric code** (e.g. `A3F8E1`) generated automatically.
- Members register themselves using this code — no email invitations needed.
- The PostgreSQL trigger (`handle_new_user`) validates the code, links the member to the correct SACCO, and creates their profile automatically.
- This approach **scales to millions of users** without hitting Supabase free-tier email limits.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL with Row Level Security)
- **Auth:** Supabase Auth with metadata-driven role assignment
- **Icons:** Lucide React
- **Hosting:** Vercel / Netlify / GitHub Pages (all free tier compatible)

---

## Setup Guide

### Prerequisites
- Node.js 18+ installed
- A free [Supabase](https://supabase.com) account
- Git installed

### Step 1: Clone the Repository
```bash
git clone https://github.com/cm-xh19/saccoflow-frontend.git
cd saccoflow-frontend
npm install
```

### Step 2: Create Your Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a **new project** (free tier).
2. Wait for the project to finish provisioning.

### Step 3: Run the Database Schema
1. In your Supabase Dashboard, go to **SQL Editor**.
2. Open the file `schema.sql` from this repository.
3. Copy and paste the entire contents into the SQL Editor.
4. Click **RUN**. This creates all tables, views, triggers, and RLS policies.

### Step 4: Configure Environment Variables
1. In your Supabase Dashboard, go to **Project Settings → API**.
2. Copy the **Project URL** and **anon public** key.
3. Open the `.env` file in the project root and paste your values:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

### Step 5: Create Your Superadmin Account
1. In Supabase Dashboard, go to **Authentication → Users**.
2. Click **Add User → Create new user**.
3. Enter your admin email and a secure password.
4. Go back to **SQL Editor** and run:
```sql
UPDATE auth.users
SET raw_user_meta_data = '{"role": "superadmin", "full_name": "Platform Admin"}'::jsonb
WHERE email = 'your-admin-email@example.com';
```

### Step 6: Run Locally
```bash
npm run dev
```
Open [http://localhost:5173/saccoflow1.0/](http://localhost:5173/saccoflow1.0/) in your browser.

---

## How Authentication Works

```
┌──────────────────────────────────────────────────────────────────┐
│  1. Superadmin creates a SACCO → auto-generates sacco_code      │
│  2. Sacco admin distributes the 6-char code to members          │
│  3. Member opens the app → clicks "Register with Code"          │
│  4. Enters: Name, Email, Password, Sacco Code                   │
│  5. Supabase Auth creates auth.users record                      │
│  6. PostgreSQL trigger fires handle_new_user()                   │
│     → Validates sacco_code against saccos table                  │
│     → Creates profiles row with role='member'                    │
│     → Links member to the correct sacco_id                       │
│     → Logs action to audit_logs                                  │
│  7. Member logs in → profile.role determines dashboard           │
│     → 'superadmin' → AdminDashboard                              │
│     → 'saccoadmin' → SaccoAdminDashboard                         │
│     → 'member'     → MemberDashboard                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Deploying to Production (Free)

### Option A: Vercel
1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com), connect your GitHub account.
3. Select the repository and add **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click Deploy.

### Option B: GitHub Pages
```bash
npm run deploy
```

---

## Cost Breakdown

| Service             | Cost       | Notes                                        |
| ------------------- | ---------- | -------------------------------------------- |
| Supabase Free Tier  | **$0/mo**  | 500MB DB, unlimited auth users via Sacco Code |
| Vercel Free Tier    | **$0/mo**  | 100GB bandwidth, serverless deployment       |
| Domain (optional)   | ~$12/year  | Custom domain via Namecheap/GoDaddy          |

You only need to upgrade Supabase ($25/mo) when you exceed 50,000 monthly active users.

---

## Project Structure

```
saccoflow-frontend/
├── App.tsx                  # Main app with auth session management
├── Login.tsx                # Login + Sacco Code registration
├── AdminDashboard.tsx       # Superadmin platform overview
├── SaccoAdminDashboard.tsx  # Sacco-level management
├── MemberDashboard.tsx      # Member personal dashboard
├── supabase.ts              # Supabase client instance
├── schema.sql               # Complete database schema for Supabase
├── index.css                # Landing page styles
├── dashboard.css            # Dashboard styles
├── .env                     # Environment variables (not committed)
├── index.html               # Entry point
├── main.tsx                 # React DOM mount
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies
```

---

## License

Built by the SaccoFlow team. All rights reserved.
