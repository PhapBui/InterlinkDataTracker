import { NextResponse } from 'next/server';

export async function GET() {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirect_uri = `${app_url}/api/auth/callback`;

  if (!client_id || client_id.trim() === '') {
    // If not configured, redirect to mock login URL
    return NextResponse.json({ url: `${app_url}/login?mock=true` });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${client_id}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&prompt=select_account`;

  return NextResponse.json({ url: authUrl });
}
