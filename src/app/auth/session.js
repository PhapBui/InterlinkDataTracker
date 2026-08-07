import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 
  (process.env.NODE_ENV === 'production' 
    ? crypto.randomBytes(32).toString('hex') 
    : 'a-very-long-and-secure-random-secret-key-12345');
const COOKIE_NAME = 'event_tracker_session';

// Helper to sign session
export function signSession(payload) {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature: hmac })).toString('base64');
}

// Helper to verify session
export function verifySession(token) {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const { payload, signature } = JSON.parse(raw);
    const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(JSON.stringify(payload)).digest('hex');
    if (hmac === signature) {
      return payload;
    }
  } catch (_) {}
  return null;
}

// Get current session in Server Components
export function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySession(token);
}

// Set session cookie in Route Handlers
export function setSessionCookie(payload) {
  const token = signSession(payload);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

// Clear session cookie
export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}
