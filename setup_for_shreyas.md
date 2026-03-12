# Setup For Shreyas

## 1) Download the Repo

```bash
git clone https://github.com/arjun-18y/lockn-go-ind-main.git
cd lockn-go-ind-main/lockn-go-ind-main
```

## 2) Required Apps / Dependencies

Install these on your machine:

1. `Git` - https://git-scm.com/downloads
2. `Node.js` (LTS, includes npm) - https://nodejs.org/en/download
3. `VS Code` (recommended) - https://code.visualstudio.com/Download
4. `Supabase account` (project access required) - https://supabase.com/dashboard/sign-in

Optional (only if backend is needed):

1. `Java 17` - https://adoptium.net/temurin/releases/?version=17
2. `Maven` - https://maven.apache.org/download.cgi
3. `Docker Desktop` (for MySQL container) - https://www.docker.com/products/docker-desktop/

## 3) Run Full App (Docker + Backend + Frontend)

Run these 3 in parallel using 3 terminals.

Terminal 1: Start MySQL in Docker

```bash
docker rm -f lockngo-mysql
docker run --name lockngo-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=lockngo -p 3306:3306 -d mysql:8.0
docker logs -f lockngo-mysql
```

Terminal 2: Start Backend


```powershell
cd "E:\project\sem 6\shreyas\lockn-go-ind-main\lockn-go-ind-main\backend"
$env:MAIL_USERNAME="lockngo547@gmail.com"
$env:MAIL_APP_PASSWORD="tqyqsculshewrooa"
$env:MAIL_FROM="lockngo547@gmail.com"
mvn spring-boot:run
```

Terminal 3: Start Frontend

```bash
cd "E:\project\sem 6\shreyas\lockn-go-ind-main\lockn-go-ind-main"
npm.cmd install
npm.cmd run dev

```

Open the URL printed in terminal (usually `http://localhost:8080` or `http://localhost:5173`).

## 4) How To Use the App

1. Sign up / login.
2. Go to `Stations`.
3. Select a station and click `Book Locker`.
4. Choose locker + duration and confirm booking.
5. Open `Dashboard` to:
   - view active/past bookings
   - extend/cancel booking
   - edit profile
   - download receipts

## 5) Admin Access / Credentials

This project uses Supabase Auth for login, so there is no pre-seeded
`admin@gmail.com / admin123` account by default.

Create admin access like this:

1. Sign up normally from the app (`/auth?signup=true`).
2. In Supabase Dashboard -> Authentication -> Users, copy that user's UUID.
3. Run this SQL in Supabase SQL Editor:

```sql
insert into public.user_roles (user_id, role)
values ('<USER_UUID>', 'admin')
on conflict (user_id, role) do nothing;
```

4. Logout and login again. You will be redirected to `/admin`.

Note: The Spring backend has a separate seeded admin (`admin@lockngo.com` / `Admin@123`),
but the frontend app in this repo logs in through Supabase Auth.

## 5.1) Required DB Migrations (locker sizes + India seed)

If you see:
`Could not find the table 'public.locker_sizes' in the schema cache`
your Supabase DB is behind the code.

Run latest migrations before testing admin/booking:

```bash
cd "E:\project\sem 6\shreyas\lockn-go-ind-main\lockn-go-ind-main"
supabase login
supabase link --project-ref saylqcyoocvrhbxcgvnr
supabase db push
```

If you are not using Supabase CLI, open Supabase SQL Editor and run:

1. `supabase/migrations/20260312110000_dynamic_locker_sizes_and_station_seed.sql`
2. `supabase/migrations/20260312123000_india_50_station_seed_and_size_dimensions.sql`
3. `supabase/migrations/20260312133000_auto_seed_india_50_stations.sql`

After migration, verify station count:

```sql
select count(*) from public.stations where is_active = true;
```

Expected: at least `50` active stations.

## 6) Important

For this shared setup, keep all 3 running while testing:

1. Docker MySQL container
2. Spring Boot backend
3. Vite frontend

## 7) Booking Confirmation Email (Gmail SMTP, No Domain Needed)

Booking confirmation emails are now sent through backend endpoint:
`POST /api/email/booking-confirmation`

Before starting backend, set these env vars:

```bash
MAIL_USERNAME=<your_gmail_address>
MAIL_APP_PASSWORD=<your_16_char_google_app_password>
MAIL_FROM=<your_gmail_address>
```

PowerShell command sequence:

```powershell
cd "E:\project\sem 6\shreyas\lockn-go-ind-main\lockn-go-ind-main\backend"
$env:MAIL_USERNAME="<your_gmail_address>"
$env:MAIL_APP_PASSWORD="<your_16_char_google_app_password>"
$env:MAIL_FROM="<your_gmail_address>"
mvn spring-boot:run
```

Frontend should point to backend:

```bash
VITE_BACKEND_URL="http://localhost:8081"
```

Verify in app:
1. Complete a locker booking.
2. User should receive confirmation email with booking details and PIN.

## 8) Deploy on Render

This repo now includes a Render blueprint file:
`render.yaml`

### Option A: Use Blueprint (recommended)

1. Push latest code to GitHub.
2. In Render dashboard, choose `New` -> `Blueprint`.
3. Select this repo and deploy.
4. Set required env vars in Render services:
   - Frontend (`lockngo-frontend`):
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_BACKEND_URL` (URL of backend service)
   - Backend (`lockngo-backend`):
     - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
     - `JWT_SECRET`
     - `MAIL_USERNAME`, `MAIL_APP_PASSWORD`, `MAIL_FROM`

### Option B: Manual Render services

Create two services:

1. Backend (Web Service, Java)
   - Root directory: `backend`
   - Build command: `mvn -DskipTests clean package`
   - Start command: `java -jar target/backend-0.0.1-SNAPSHOT.jar`

2. Frontend (Static Site)
   - Root directory: `.`
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
   - Rewrite rule: `/*` -> `/index.html`

### Important notes

1. Backend uses MySQL config (`DB_*`), so provide a reachable MySQL instance.
2. Frontend core app (stations/bookings/admin) works with Supabase directly.
3. Backend is mainly required for booking confirmation email endpoint.
