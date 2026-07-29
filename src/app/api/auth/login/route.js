import { NextResponse } from 'next/server';

export async function GET() {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cleanAppUrl = app_url.endsWith('/') ? app_url.slice(0, -1) : app_url;
  const redirect_uri = `${cleanAppUrl}/api/auth/callback`.replace(/([^:]\/)\/+/g, '$1');

  if (!client_id || client_id.trim() === '') {
    return NextResponse.json({ error: 'MissingConfig' }, { status: 400 });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${client_id}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&prompt=select_account`;

  return NextResponse.json({ url: authUrl });
}
