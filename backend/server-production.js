require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Database with connection retry
const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(() => process.exit(1), 5000);
  } else {
    console.log('✅ Database connected');
  }
});

// Migrate plaintext passwords to bcrypt
db.query("SELECT id, password_hash FROM users WHERE password_hash NOT LIKE '$2b$%' AND password_hash NOT LIKE '$2a$%'").then(async (result) => {
  for (const user of result.rows) {
    const hashed = await bcrypt.hash(user.password_hash || 'admin123', 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, user.id]);
    console.log(`✅ Migrated password for user ${user.id}`);
  }
}).catch((err) => { console.error('Password migration skipped:', err.message); });

// Disable sub-1B models (kept in DB but hidden from API)
db.query(
  "UPDATE models SET enabled = false WHERE model_id IN ('quantum-135m', 'quantum-360m', 'voicecore-tiny')"
).then((result) => {
  if (result.rowCount > 0) console.log(`✅ Disabled ${result.rowCount} sub-1B models`);
}).catch((err) => { console.error('Model cleanup skipped:', err.message); });

// Ensure reset token columns exist
db.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
`).catch(() => {});

// CORS - production-ready
const allowedOrigins = process.env.CORS_ORIGIN ?
  process.env.CORS_ORIGIN.split(',') :
  ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'change-this-in-production') {
  console.error('❌ FATAL: JWT_SECRET not set!');
  process.exit(1);
}

// Auth middleware
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await db.query(`
      SELECT u.*, o.id as org_id FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
    `, [decoded.userId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = userResult.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// SDK API Key authentication - allows SDK to auth with just an API key
app.post('/api/auth/sdk', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }
  try {
    const orgResult = await db.query(
      'SELECT o.*, u.id as user_id, u.email, u.name, u.role FROM organizations o JOIN users u ON u.organization_id = o.id WHERE o.api_key = $1 AND u.role = $2 LIMIT 1',
      [apiKey, 'admin']
    );
    if (orgResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    const org = orgResult.rows[0];
    const token = jwt.sign({ userId: org.user_id, email: org.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, organization: { name: org.name, api_key: org.api_key } });
  } catch (err) {
    console.error('SDK auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const result = await db.query('SELECT u.*, o.name as org_name, o.api_key as org_api_key FROM users u JOIN organizations o ON u.organization_id = o.id WHERE u.email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, organization: { name: user.org_name, api_key: user.org_api_key } } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password - sends reset link via email
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const user = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.rows[0].id]
    );

    const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.slyos.world';
    const resetUrl = `${dashboardUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: '"SlyOS by Belto" <support@belto.world>',
      to: email,
      subject: 'Reset Your SlyOS Password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #050505; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #FF4D00; border-radius: 12px; line-height: 48px; font-size: 24px;">🔥</div>
            <h1 style="color: #EDEDED; font-size: 24px; margin: 16px 0 8px;">Reset Your Password</h1>
            <p style="color: #888888; font-size: 14px; margin: 0;">Hi ${user.rows[0].name}, we received a password reset request for your account.</p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #FF4D00; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">Reset Password</a>
          </div>
          <p style="color: #666666; font-size: 12px; text-align: center;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 24px 0;" />
          <p style="color: #444444; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} Belto Inc. — SlyOS Edge AI Platform</p>
        </div>
      `
    });

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password - validates token and updates password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const user = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, user.rows[0].id]
    );

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Registration
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, organizationName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    // Check if email already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const orgName = organizationName || name + "'s Organization";

    // Generate API key
    const apiKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');

    // Create organization
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    const orgResult = await db.query(
      'INSERT INTO organizations (name, slug, api_key) VALUES ($1, $2, $3) RETURNING *',
      [orgName, slug, apiKey]
    );
    const org = orgResult.rows[0];

    // Create user
    const userResult = await db.query(
      'INSERT INTO users (email, password_hash, name, organization_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [email, passwordHash, name, org.id, 'admin']
    );
    const user = userResult.rows[0];

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Send welcome email (non-blocking)
    transporter.sendMail({
      from: '"SlyOS by Belto" <support@belto.world>',
      to: email,
      subject: 'Welcome to SlyOS — Your Edge AI Platform',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #050505; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #FF4D00; border-radius: 12px; line-height: 48px; font-size: 24px;">🔥</div>
            <h1 style="color: #EDEDED; font-size: 24px; margin: 16px 0 8px;">Welcome to SlyOS!</h1>
            <p style="color: #888888; font-size: 14px; margin: 0;">Hi ${name}, your Edge AI infrastructure is ready.</p>
          </div>
          <div style="background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="color: #EDEDED; font-size: 14px; font-weight: 600; margin: 0 0 12px;">Your API Key</p>
            <code style="display: block; background: #111; color: #4ade80; padding: 12px 16px; border-radius: 8px; font-size: 13px; word-break: break-all;">${apiKey}</code>
            <p style="color: #666666; font-size: 11px; margin: 8px 0 0;">Keep this key secret. Use it to authenticate your SDK.</p>
          </div>
          <div style="background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="color: #EDEDED; font-size: 14px; font-weight: 600; margin: 0 0 12px;">Quick Start</p>
            <code style="display: block; background: #111; color: #4ade80; padding: 12px 16px; border-radius: 8px; font-size: 12px; white-space: pre;">npm install @emilshirokikh/slyos-sdk</code>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.DASHBOARD_URL || 'https://dashboard.slyos.world'}/dashboard" style="display: inline-block; background: #FF4D00; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Dashboard →</a>
          </div>
          <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 24px 0;" />
          <p style="color: #444444; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} Belto Inc. — SlyOS Edge AI Platform</p>
        </div>
      `
    }).catch(err => console.error('Welcome email failed:', err));

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organization: { name: org.name, api_key: org.api_key } }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT u.id, u.email, u.name, u.role, u.created_at, u.last_login, o.name as org_name, o.api_key as org_api_key FROM users u JOIN organizations o ON u.organization_id = o.id WHERE u.id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    res.json({
      id: user.id, email: user.email, name: user.name, role: user.role,
      created_at: user.created_at, last_login: user.last_login,
      organization: { name: user.org_name, api_key: user.org_api_key }
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
app.put('/api/auth/profile', authenticate, async (req, res) => {
  const { name, email } = req.body;
  try {
    if (email && email !== req.user.email) {
      const existing = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }
    const result = await db.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING id, email, name, role',
      [name, email, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
app.put('/api/auth/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const valid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update organization
app.put('/api/auth/organization', authenticate, async (req, res) => {
  const { name } = req.body;
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update organization settings' });
  }
  try {
    const result = await db.query(
      'UPDATE organizations SET name = COALESCE($1, name) WHERE id = $2 RETURNING name, api_key',
      [name, req.user.org_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update org error:', err);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

app.post('/api/devices/register', authenticate, async (req, res) => {
  const { device_id, platform, os_version, total_memory_mb, cpu_cores, country } = req.body;
  if (!device_id || !platform) {
    return res.status(400).json({ error: 'device_id and platform required' });
  }
  try {
    const result = await db.query(`
      INSERT INTO devices (organization_id, device_id, platform, os_version, total_memory_mb, cpu_cores, country, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id, device_id) 
      DO UPDATE SET last_seen = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.org_id, device_id, platform, os_version, total_memory_mb, cpu_cores, country]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

app.get('/api/devices', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*, COUNT(dm.id) as model_count FROM devices d 
      LEFT JOIN device_models dm ON d.id = dm.device_id
      WHERE d.organization_id = $1 GROUP BY d.id ORDER BY d.last_seen DESC LIMIT 100
    `, [req.user.org_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.get('/api/models', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT m.*, COUNT(dm.id) as device_count, SUM(dm.total_inferences) as total_inferences
      FROM models m LEFT JOIN device_models dm ON m.id = dm.model_id
      WHERE m.enabled = true GROUP BY m.id ORDER BY m.recommended DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.get('/api/analytics/overview', authenticate, async (req, res) => {
  try {
    const devices = await db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL \'24 hours\') as active FROM devices WHERE organization_id = $1', [req.user.org_id]);

    // Try analytics_daily first, fall back to counting telemetry_events directly
    let todayData = { total_inferences: 0, total_tokens_generated: 0 };
    const today = await db.query('SELECT * FROM analytics_daily WHERE organization_id = $1 AND date = CURRENT_DATE', [req.user.org_id]).catch(() => ({ rows: [] }));
    if (today.rows.length > 0 && today.rows[0].total_inferences > 0) {
      todayData = today.rows[0];
    } else {
      // Fallback: count directly from telemetry_events
      const live = await db.query(`
        SELECT COUNT(*) as total_inferences, COALESCE(SUM(tokens_generated), 0) as total_tokens_generated
        FROM telemetry_events
        WHERE organization_id = $1 AND event_type = 'inference' AND success = true AND timestamp >= CURRENT_DATE
      `, [req.user.org_id]).catch(() => ({ rows: [{ total_inferences: 0, total_tokens_generated: 0 }] }));
      todayData = live.rows[0];
    }

    // Also get all-time stats for cost savings
    const allTime = await db.query(`
      SELECT COUNT(*) as total_inferences, COALESCE(SUM(tokens_generated), 0) as total_tokens
      FROM telemetry_events
      WHERE organization_id = $1 AND event_type = 'inference' AND success = true
    `, [req.user.org_id]).catch(() => ({ rows: [{ total_inferences: 0, total_tokens: 0 }] }));

    const modelDist = await db.query(`SELECT m.name, COUNT(dm.device_id) as count FROM models m LEFT JOIN device_models dm ON m.id = dm.model_id LEFT JOIN devices d ON dm.device_id = d.id WHERE d.organization_id = $1 GROUP BY m.id`, [req.user.org_id]);
    const activity = await db.query(`SELECT DATE_TRUNC('hour', timestamp) as hour, COUNT(*) as events FROM telemetry_events WHERE organization_id = $1 AND timestamp > NOW() - INTERVAL '24 hours' GROUP BY hour ORDER BY hour DESC`, [req.user.org_id]);

    const totalTokensAllTime = parseInt(allTime.rows[0]?.total_tokens) || 0;
    const estimatedSaved = (totalTokensAllTime / 1000) * 0.01;

    res.json({
      devices: devices.rows[0],
      today: {
        total_inferences: parseInt(todayData.total_inferences) || 0,
        total_tokens_generated: parseInt(todayData.total_tokens_generated) || 0,
      },
      allTime: {
        total_inferences: parseInt(allTime.rows[0]?.total_inferences) || 0,
        total_tokens: totalTokensAllTime,
      },
      modelDistribution: modelDist.rows,
      recentActivity: activity.rows,
      costSavings: { tokensGenerated: totalTokensAllTime, estimatedCostSaved: parseFloat(estimatedSaved.toFixed(4)) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.post('/api/telemetry', authenticate, async (req, res) => {
  const { device_id, model_id, event_type, latency_ms, tokens_generated, success = true } = req.body;
  try {
    const deviceResult = await db.query('SELECT id FROM devices WHERE device_id = $1 AND organization_id = $2', [device_id, req.user.org_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const deviceUUID = deviceResult.rows[0].id;
    let modelUUID = null;
    if (model_id) {
      const modelResult = await db.query('SELECT id FROM models WHERE model_id = $1', [model_id]);
      modelUUID = modelResult.rows[0]?.id;
    }
    await db.query('INSERT INTO telemetry_events (organization_id, device_id, model_id, event_type, latency_ms, tokens_generated, success) VALUES ($1, $2, $3, $4, $5, $6, $7)', [req.user.org_id, deviceUUID, modelUUID, event_type, latency_ms, tokens_generated, success]);

    // Update analytics_daily so dashboard shows real inference counts & cost savings
    if (event_type === 'inference' && success) {
      await db.query(`
        INSERT INTO analytics_daily (organization_id, date, total_inferences, total_tokens_generated)
        VALUES ($1, CURRENT_DATE, 1, $2)
        ON CONFLICT (organization_id, date)
        DO UPDATE SET
          total_inferences = analytics_daily.total_inferences + 1,
          total_tokens_generated = analytics_daily.total_tokens_generated + $2
      `, [req.user.org_id, tokens_generated || 0]).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// WebSocket
wss.on('connection', (ws) => {
  console.log('WebSocket connected');
  ws.send(JSON.stringify({ type: 'connected', timestamp: new Date() }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🚀 SlyOS Mission Control API            ║
║   Status: RUNNING ✅                      ║
║   Port: ${PORT}                            ║
║   Env: ${process.env.NODE_ENV}             ║
╚═══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    db.end();
    process.exit(0);
  });
});
