# SlyOS Backend API

Node.js/Express backend for the SlyOS platform. Handles authentication, device registration, telemetry, analytics, RAG/knowledge bases, billing, and widget functionality.

## Setup

```bash
npm install
cp .env.example .env  # Fill in your environment variables
node server.js
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Database Configuration
```
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

### Authentication & Security
```
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### Email Configuration
```
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

### CORS & API Configuration
```
CORS_ORIGIN=http://localhost:3000
API_URL=http://localhost:3000
DASHBOARD_URL=https://your-dashboard-url.com
```

### Billing & Payments
```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Application Configuration
```
NODE_ENV=development
PORT=8080
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create new account |
| POST | `/api/auth/login` | No | User login |
| POST | `/api/auth/google` | No | Google OAuth authentication |
| POST | `/api/auth/forgot-password` | No | Request password reset token |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| POST | `/api/auth/sdk` | No | SDK authentication via API key |
| GET | `/api/auth/me` | Yes | Get current authenticated user info |
| PUT | `/api/auth/profile` | Yes | Update user profile |
| PUT | `/api/auth/password` | Yes | Change user password |
| PUT | `/api/auth/organization` | Yes | Update organization details |

### Devices

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/devices/register` | Yes | Register new device |
| GET | `/api/devices` | Yes | List all devices for organization |
| PUT | `/api/devices/:deviceId/toggle` | Yes | Toggle device active/inactive |
| DELETE | `/api/devices/:deviceId` | Yes | Delete device |
| POST | `/api/devices/telemetry` | Yes | Log telemetry/inference event |
| GET | `/api/devices/:deviceId/score` | Yes | Get device performance score |
| GET | `/api/devices/:deviceId/metrics` | Yes | Get device metrics and statistics |
| PUT | `/api/devices/:deviceId/name` | Yes | Update device name |
| GET | `/api/devices/:deviceId/details` | Yes | Get detailed device information |

### Models

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/models` | Yes | List available AI models |

### Telemetry

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/telemetry` | Yes | Log telemetry events |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/overview` | Yes | Get dashboard analytics overview |

### Ideas/Features

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/ideas` | Yes | List feature ideas/requests |
| POST | `/api/ideas` | Yes | Create new feature idea |
| POST | `/api/ideas/:ideaId/vote` | Yes | Vote on feature idea |
| DELETE | `/api/ideas/:ideaId` | Yes | Delete feature idea |

### RAG / Knowledge Bases

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/rag/knowledge-bases` | Yes | Create new knowledge base |
| GET | `/api/rag/knowledge-bases` | Yes | List all knowledge bases |
| GET | `/api/rag/knowledge-bases/:kbId` | Yes | Get knowledge base details |
| PUT | `/api/rag/knowledge-bases/:kbId` | Yes | Update knowledge base |
| DELETE | `/api/rag/knowledge-bases/:kbId` | Yes | Delete knowledge base |
| POST | `/api/rag/knowledge-bases/:kbId/documents/upload` | Yes | Upload documents to knowledge base |
| POST | `/api/rag/knowledge-bases/:kbId/documents/scrape` | Yes | Scrape web content into knowledge base |
| GET | `/api/rag/knowledge-bases/:kbId/documents` | Yes | List documents in knowledge base |
| DELETE | `/api/rag/knowledge-bases/:kbId/documents/:docId` | Yes | Delete document from knowledge base |
| POST | `/api/rag/knowledge-bases/:kbId/search` | Yes | Search knowledge base |
| POST | `/api/rag/knowledge-bases/:kbId/query` | Yes | Query knowledge base with RAG |
| POST | `/api/rag/knowledge-bases/:kbId/sync` | Yes | Sync/update knowledge base |

### Billing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/billing/status` | Yes | Get billing status and subscription info |
| POST | `/api/billing/portal` | Yes | Get Stripe billing portal link |
| POST | `/api/billing/validate-discount` | Yes | Validate discount code |
| POST | `/api/billing/create-checkout` | Yes | Create Stripe checkout session |
| POST | `/api/billing/webhook` | No | Stripe webhook for subscription events |

### Credits

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/credits/balance` | Yes | Get current credit balance |
| POST | `/api/credits/purchase` | Yes | Purchase credits |

### API Keys

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/keys` | Yes | List API keys |
| POST | `/api/keys/regenerate` | Yes | Regenerate API key |

### Widget

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/widget/config` | No | Get widget configuration |
| GET | `/api/widget/:orgApiKey/chat` | No | Get chat widget content |
| POST | `/api/widget/:orgApiKey/generate` | No | Generate content via widget |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check endpoint |

## Authentication

Most endpoints require authentication via JWT token. Include the token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens are obtained by:
1. Registering a new account at `/api/auth/register`
2. Logging in at `/api/auth/login`
3. Using Google OAuth at `/api/auth/google`
4. Using SDK authentication at `/api/auth/sdk` with API key

## Billing Status Check

Several endpoints check billing status (via `checkBillingStatus` middleware):
- `/api/devices/register`
- `/api/devices`
- `/api/models`
- `/api/analytics/overview`
- `/api/telemetry`
- `/api/rag/knowledge-bases` (all endpoints)
- `/api/credits/balance`
- `/api/credits/purchase`

These endpoints return a 402 (Payment Required) status if the organization is not in good standing.

## Database Schema

The backend uses PostgreSQL with the following main tables:
- `users` - User accounts and authentication
- `organizations` - Organization/team management
- `devices` - Registered devices
- `device_metrics` - Device performance metrics
- `telemetry_events` - Inference/usage telemetry
- `ideas` - Feature requests/ideas
- `knowledge_bases` - RAG knowledge bases
- `documents` - Documents in knowledge bases
- `discount_codes` - Billing discount codes

## WebSocket Support

The server supports WebSocket connections at `/ws` for real-time updates and bidirectional communication.

## Deployment

For deployment information, see internal documentation. The application should be deployed with:
- Node.js runtime
- PostgreSQL database
- Stripe account for billing
- Google OAuth credentials
- SMTP/Gmail configuration for emails
- CORS properly configured for frontend domain

## Error Handling

The API returns standard HTTP status codes:
- `200` - Success
- `400` - Bad request
- `401` - Unauthorized
- `402` - Payment required (billing issues)
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

Error responses include a JSON body with error details.

## Rate Limiting

The API does not currently implement rate limiting but may be added in production.

## License

MIT
