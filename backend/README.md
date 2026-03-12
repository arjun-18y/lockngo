# LockNGo Backend (Spring Boot)

## Run

1. Create MySQL database or let app create it.
2. Set environment variables (optional):
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `JWT_SECRET`, `JWT_EXPIRATION_MS`
   - `MAIL_USERNAME`, `MAIL_APP_PASSWORD`, `MAIL_FROM` (for booking emails)
3. Start:

```bash
mvn spring-boot:run
```

PowerShell (Windows):

```powershell
cd "E:\project\sem 6\shreyas\lockn-go-ind-main\lockn-go-ind-main\backend"
$env:MAIL_USERNAME="<your_gmail_address>"
$env:MAIL_APP_PASSWORD="<your_16_char_google_app_password>"
$env:MAIL_FROM="<your_gmail_address>"
mvn spring-boot:run
```

Default URL: `http://localhost:8080`

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
