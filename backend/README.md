# LockNGo Backend (Spring Boot)

## Run

1. Choose one database mode:
   - MySQL (local Docker/dev): use `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - Supabase Postgres (deploy): set `DB_URL`, `DB_USER`, `DB_PASSWORD`
2. Set environment variables (optional):
   - `DB_URL` (example: `jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require`)
   - MySQL fallback vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_SSL_MODE`, `DB_CREATE_IF_NOT_EXISTS`, `DB_ALLOW_PUBLIC_KEY_RETRIEVAL`
   - `JWT_SECRET`, `JWT_EXPIRATION_MS`
   - `MAIL_USERNAME`, `MAIL_APP_PASSWORD`, `MAIL_FROM` (for booking emails)
3. Start:

```bash
mvn spring-boot:run
```

PowerShell (Windows):

```powershell
cd "E:\project\sem 6\shreyas\lockn-go-ind-main\lockn-go-ind-main\backend"
$env:DB_URL="jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
$env:DB_USER="<supabase_db_user>"
$env:DB_PASSWORD="<supabase_db_password>"
$env:MAIL_USERNAME="<your_gmail_address>"
$env:MAIL_APP_PASSWORD="<your_16_char_google_app_password>"
$env:MAIL_FROM="<your_gmail_address>"
mvn spring-boot:run
```

Default URL: `http://localhost:8081`

Note: Backend tables are prefixed as `backend_*` to avoid collision with frontend Supabase tables.

## Default Seed Data

- Admin user:
  - Email: `admin@lockngo.com`
  - Password: `Admin@123`
- Lockers:
  - 10 SMALL, 8 MEDIUM, 6 LARGE (all AVAILABLE)

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### User
- `GET /api/lockers/available`
- `POST /api/bookings`
- `GET /api/bookings/my`
- `PUT /api/bookings/{id}/complete` (optional completion endpoint)

### Email
- `POST /api/email/booking-confirmation` (public endpoint used by frontend)

### Admin
- `GET /api/admin/lockers`
- `PUT /api/admin/lockers/{id}`
- `GET /api/admin/bookings`
