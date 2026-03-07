# LockNGo Setup Guide

This guide helps a new developer run the project locally.

## 1) Clone Repository

```bash
git clone https://github.com/arjun-18y/lockn-go-ind-main.git
cd lockn-go-ind-main/lockn-go-ind-main
```

## 2) Install Dependencies

```bash
npm install
```

## 3) Configure Environment

Create a `.env` file in this folder (`lockn-go-ind-main/lockn-go-ind-main`) with:

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

Notes:
- `VITE_*` variables are public client-side variables.
- Do not put service role keys or private secrets in `.env`.

## 4) Setup Supabase Database (SQL Migrations)

Open Supabase SQL Editor and run these files in order:

1. `supabase/migrations/20251109072522_32db03a4-3d34-4c44-889b-a91f99d8e5c8.sql`
2. `supabase/migrations/20260307223000_booking_lifecycle_controls.sql`
3. `supabase/migrations/20260308091500_admin_incidents.sql`

If Supabase warns about destructive operations (`DROP TRIGGER IF EXISTS ...`), this is expected for idempotent trigger creation in migration 3.

## 5) Run Frontend

```bash
npm run dev
```

Open the URL printed by Vite (commonly `http://localhost:8080` or `http://localhost:5173`).

## 6) Authentication Setup Notes

- If login says `Email not confirmed`, either:
  - confirm email from inbox, or
  - disable email confirmation in Supabase Auth (dev-only).
- If signup shows rate-limit errors, wait and retry later or use a different email.

## 7) Make an Admin User (Optional)

1. In Supabase Dashboard -> `Authentication` -> `Users`, copy the user UUID.
2. Run:

```sql
insert into public.user_roles (user_id, role)
values ('<USER_UUID>', 'admin')
on conflict (user_id, role) do nothing;
```

3. Login again with that user. Admin users are redirected to `/admin`.

## 8) Verify Admin Role

```sql
select user_id, role
from public.user_roles
where user_id = '<USER_UUID>';
```

You should see `role = admin`.

## 9) Common Issues

### Admin page redirects to dashboard
- User does not have `admin` role in `public.user_roles`.
- Role was inserted in a different Supabase project than the one in `.env`.

### Admin page blank
- Open browser console and check first red error line.
- Ensure latest code is pulled and migrations are executed.

### RPC function not found (e.g. `cancel_booking`)
- Run migration `20260307223000_booking_lifecycle_controls.sql`.
- Then run:

```sql
notify pgrst, 'reload schema';
```

### No stations/lockers visible
- Insert sample station + lockers from admin panel or SQL.

## 10) Backend (Optional)

Current frontend is Supabase-first and works without Spring backend.
If you also want backend:

```bash
cd backend
mvn spring-boot:run
```

Backend DB config is in `backend/src/main/resources/application.yml`.
