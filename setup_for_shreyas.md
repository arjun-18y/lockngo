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

```bash
cd backend
mvn spring-boot:run
```

Terminal 3: Start Frontend

```bash
npm install
npm run dev
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

Use the following admin login:

1. Email: `admin@gmail.com`
2. Password: `admin123`

After login, admin user is redirected to `/admin`.

## 6) Important

For this shared setup, keep all 3 running while testing:

1. Docker MySQL container
2. Spring Boot backend
3. Vite frontend
