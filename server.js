import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5174;
const BASE_PATH = '/evaluation-service';

app.use(cors());
app.use(express.json());

const registrations = new Map();
const tokens = new Map();

function createClientId(rollNo) {
  return `client-${rollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
}

function createClientSecret() {
  return `secret-${Math.random().toString(36).slice(2, 12)}`;
}

function createToken() {
  return `token-${Math.random().toString(36).slice(2, 16)}`;
}

app.post(`${BASE_PATH}/register`, (req, res) => {
  const { email, name, roll_no, github_username, access_code } = req.body;

  if (!email || !name || !roll_no || !github_username || !access_code) {
    return res.status(400).json({ message: 'Missing required registration fields.' });
  }

  const normalizedEmail = String(email).toLowerCase();
  const existing = registrations.get(normalizedEmail);
  if (existing) {
    return res.json({
      clientId: existing.clientId,
      clientSecret: existing.clientSecret
    });
  }

  const clientId = createClientId(String(roll_no));
  const clientSecret = createClientSecret();

  registrations.set(normalizedEmail, {
    email: normalizedEmail,
    name: String(name),
    rollNo: String(roll_no),
    githubUsername: String(github_username),
    accessCode: String(access_code),
    clientId,
    clientSecret
  });

  return res.json({ clientId, clientSecret });
});

app.post(`${BASE_PATH}/auth`, (req, res) => {
  const { email, name, roll_no, access_code, client_id, client_secret } = req.body;

  if (!email || !name || !roll_no || !access_code || !client_id || !client_secret) {
    return res.status(400).json({ message: 'Missing required authentication fields.' });
  }

  const normalizedEmail = String(email).toLowerCase();
  const existing = registrations.get(normalizedEmail);
  if (!existing) {
    return res.status(400).json({ message: 'Registration not found for this email.' });
  }

  if (
    existing.name !== String(name) ||
    existing.rollNo !== String(roll_no) ||
    existing.accessCode !== String(access_code) ||
    existing.clientId !== String(client_id) ||
    existing.clientSecret !== String(client_secret)
  ) {
    return res.status(400).json({ message: 'Authentication details do not match registered user.' });
  }

  const token = createToken();
  tokens.set(token, normalizedEmail);

  return res.json({ token, token_type: 'Bearer', expires_in: 3600 });
});

app.get(`${BASE_PATH}/notifications`, (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token || !tokens.has(token)) {
    return res.status(401).json({ message: 'Invalid or missing auth token.' });
  }

  const notificationType = String(req.query.notification_type || 'All');
  const limit = Number(req.query.limit || 10);
  const page = Number(req.query.page || 1);

  const allNotifications = [
    {
      ID: 'notif-001',
      Type: 'Result',
      Message: 'Your final year project evaluation is scheduled for next week.',
      Timestamp: '2026-05-23T12:40:00Z'
    },
    {
      ID: 'notif-002',
      Type: 'Placement',
      Message: 'A placement interview invitation has been shared to your registered email.',
      Timestamp: '2026-05-23T10:15:00Z'
    },
    {
      ID: 'notif-003',
      Type: 'Event',
      Message: 'Campus hiring webinar starts today at 4 PM in the auditorium.',
      Timestamp: '2026-05-22T18:20:00Z'
    },
    {
      ID: 'notif-004',
      Type: 'Result',
      Message: 'Your semester results are available in the student portal.',
      Timestamp: '2026-05-21T09:30:00Z'
    }
  ];

  const filtered = notificationType === 'All'
    ? allNotifications
    : allNotifications.filter((notification) => notification.Type === notificationType);

  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return res.json(paged);
});

app.listen(PORT, () => {
  console.log(`API server listening at http://localhost:${PORT}${BASE_PATH}`);
});
