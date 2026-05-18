import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AuthPayload, Notification, RegisterResponse, RegistrationPayload } from './types';
import { authenticateUser, fetchNotifications, registerUser } from './api';

const notificationTypeLabels = ['All', 'Result', 'Placement', 'Event'];
const sampleNotifications: Notification[] = [
  {
    ID: '1',
    Type: 'Result',
    Message: 'Your placement test result is available in the student portal.',
    Timestamp: '2026-05-23 12:40:00'
  },
  {
    ID: '2',
    Type: 'Placement',
    Message: 'A new placement notification has arrived from Acme Corp.',
    Timestamp: '2026-05-23 10:15:00'
  },
  {
    ID: '3',
    Type: 'Event',
    Message: 'Campus hiring webinar scheduled for tomorrow at 4 PM.',
    Timestamp: '2026-05-22 18:20:00'
  }
];

function getBadgeClass(type: string) {
  if (type.toLowerCase() === 'result') return 'badge result';
  if (type.toLowerCase() === 'placement') return 'badge placement';
  return 'badge event';
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function App() {
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('authToken') ?? '');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState('All');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const authPayload: AuthPayload = {
    email,
    name,
    rollNo,
    accessCode,
    clientId,
    clientSecret
  };

  const registerPayload: RegistrationPayload = {
    email,
    name,
    rollNo,
    githubUsername,
    accessCode
  };

  const filteredNotifications = useMemo(() => {
    if (filterType === 'All') return notifications;
    return notifications.filter((notification) => notification.Type === filterType);
  }, [filterType, notifications]);

  const sortedNotifications = useMemo(() => {
    return [...filteredNotifications].sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
  }, [filteredNotifications]);

  useEffect(() => {
    if (!token) return;
    setError('');
    setIsFetching(true);

    fetchNotifications(token, { limit, page, type: filterType })
      .then((data) => {
        setNotifications(data);
        setStatusMessage('Fetched notifications from the evaluation API.');
      })
      .catch((err) => {
        setNotifications(sampleNotifications);
        setError('Unable to fetch remote notifications. Using local sample data for UI demonstration.');
        console.warn(err);
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [token, filterType, limit, page]);

  function persistAuth(tokenValue: string, id?: string, secret?: string) {
    localStorage.setItem('authToken', tokenValue);
    if (id) localStorage.setItem('clientId', id);
    if (secret) localStorage.setItem('clientSecret', secret);
    setToken(tokenValue);
  }

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatusMessage('Registering...');

    registerUser(registerPayload)
      .then((response: RegisterResponse) => {
        setClientId(response.clientId);
        setClientSecret(response.clientSecret);
        localStorage.setItem('clientId', response.clientId);
        localStorage.setItem('clientSecret', response.clientSecret);
        setIsRegistering(false);
        if (response.localFallback) {
          setStatusMessage('Remote registration endpoint unavailable. Using local fallback credentials.');
        } else {
          setStatusMessage('Registration succeeded. Now authenticate to get your token.');
        }
      })
      .catch((err) => {
        setError(err.message);
      });
  }

  function handleAuthenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatusMessage('Authenticating...');

    authenticateUser(authPayload)
      .then((response) => {
        const accessToken = response.access_token || response.token;
        if (!accessToken) {
          throw new Error('Authentication succeeded but no access token was returned.');
        }
        persistAuth(accessToken);
        if (response.localFallback) {
          setStatusMessage('Remote auth endpoint unavailable. Authentication succeeded using local fallback.');
        } else {
          setStatusMessage('Authentication succeeded. Loading notifications...');
        }
      })
      .catch((err) => {
        setError(err.message);
      });
  }

  function handleLogout() {
    localStorage.removeItem('authToken');
    setToken('');
    setNotifications([]);
    setStatusMessage('You are logged out.');
  }

  function renderAuthForm() {
    return (
      <div className="card">
        <div className="header">
          <div className="brand">
            <h1>Registration & Authentication</h1>
            <p>Complete the registration and auth steps to unlock the notifications inbox.</p>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {statusMessage && !error && <div className="alert" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>{statusMessage}</div>}

        {isRegistering ? (
          <form onSubmit={handleRegister} className="controls">
            <div className="label-group">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@college.edu" />
            </div>
            <div className="label-group">
              <label htmlFor="name">Name</label>
              <input id="name" className="input" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your Name" />
            </div>
            <div className="label-group">
              <label htmlFor="rollNo">Roll Number</label>
              <input id="rollNo" className="input" required value={rollNo} onChange={(event) => setRollNo(event.target.value)} placeholder="ABC12345" />
            </div>
            <div className="label-group">
              <label htmlFor="githubUsername">GitHub Username</label>
              <input id="githubUsername" className="input" required value={githubUsername} onChange={(event) => setGithubUsername(event.target.value)} placeholder="github username" />
            </div>
            <div className="label-group">
              <label htmlFor="accessCode">Access Code</label>
              <input id="accessCode" className="input" required value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Access code from evaluation email" />
            </div>
            <button type="submit" className="button">Register</button>
          </form>
        ) : (
          <form onSubmit={handleAuthenticate} className="controls">
            <div className="label-group">
              <label htmlFor="token-email">Email</label>
              <input id="token-email" className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="label-group">
              <label htmlFor="token-name">Name</label>
              <input id="token-name" className="input" required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="label-group">
              <label htmlFor="token-rollNo">Roll Number</label>
              <input id="token-rollNo" className="input" required value={rollNo} onChange={(event) => setRollNo(event.target.value)} />
            </div>
            <div className="label-group">
              <label htmlFor="token-accessCode">Access Code</label>
              <input id="token-accessCode" className="input" required value={accessCode} onChange={(event) => setAccessCode(event.target.value)} />
            </div>
            <div className="label-group">
              <label htmlFor="clientId">Client ID</label>
              <input id="clientId" className="input" required value={clientId} onChange={(event) => setClientId(event.target.value)} />
            </div>
            <div className="label-group">
              <label htmlFor="clientSecret">Client Secret</label>
              <input id="clientSecret" className="input" required value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="submit" className="button">Authenticate</button>
              <button type="button" className="button secondary" onClick={() => setIsRegistering(true)}>Back to register</button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (!token) {
    return (
      <div className="app-shell">
        <div className="header">
          <div className="brand">
            <h1>Campus Notifications</h1>
            <p>Sign in or register to fetch notifications from the protected evaluation API.</p>
          </div>
        </div>
        {renderAuthForm()}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="header">
        <div className="brand">
          <h1>Campus Notifications</h1>
          <p>Build a responsive React inbox for placement and result notifications.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ padding: '10px 16px', borderRadius: '999px', background: '#e0e7ff', color: '#3730a3' }}>Logged in</span>
          <button type="button" className="button secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="card">
        <div className="header" style={{ alignItems: 'flex-start' }}>
          <div className="brand">
            <h1>Priority Inbox</h1>
            <p>Top notifications are ordered by timestamp and filtered by category.</p>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {statusMessage && !error && <div className="alert" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>{statusMessage}</div>}

        <div className="controls" style={{ marginTop: 16 }}>
          <div className="label-group">
            <label htmlFor="filterType">Notification Type</label>
            <select id="filterType" className="select" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
              {notificationTypeLabels.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="label-group">
            <label htmlFor="limit">Items per page</label>
            <select id="limit" className="select" value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
              {[5, 10, 15, 20].map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </div>
          <div className="label-group">
            <label htmlFor="page">Page</label>
            <select id="page" className="select" value={page} onChange={(event) => setPage(Number(event.target.value))}>
              {[1, 2, 3, 4].map((pageIndex) => (
                <option key={pageIndex} value={pageIndex}>{pageIndex}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="notification-grid">
        {isFetching ? (
          <div className="card">Loading notifications...</div>
        ) : sortedNotifications.length === 0 ? (
          <div className="card">No notifications available for the selected filter.</div>
        ) : (
          sortedNotifications.map((notification) => (
            <div key={notification.ID} className="notification-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <h3>{notification.Message}</h3>
                <span className={getBadgeClass(notification.Type)}>{notification.Type}</span>
              </div>
              <small>{formatTimestamp(notification.Timestamp)}</small>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default App;
