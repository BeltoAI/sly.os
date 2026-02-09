# SlyOS Backend API

Node.js/Express backend for the SlyOS platform. Handles authentication, device registration, telemetry, and analytics.

## Setup

```bash
npm install
cp .env.example .env  # Fill in your environment variables
node server.js
```

## Environment Variables

Create a `.env` file with:

```
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3000
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
DASHBOARD_URL=https://your-dashboard-url.com
NODE_ENV=development
PORT=8080
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | User login |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| POST | `/api/auth/sdk` | No | SDK authentication via API key |
| GET | `/api/auth/me` | Yes | Get current user |
| PUT | `/api/auth/profile` | Yes | Update profile |
| PUT | `/api/auth/password` | Yes | Change password |
| POST | `/api/devices/register` | Yes | Register device |
| GET | `/api/devices` | Yes | List devices |
| GET | `/api/models` | Yes | List available models |
| POST | `/api/telemetry` | Yes | Log inference event |
| GET | `/api/analytics/overview` | Yes | Dashboard analytics |
| GET | `/health` | No | Health check |

## Deployment

See internal deployment docs (not included in public repo).

## License

MIT
