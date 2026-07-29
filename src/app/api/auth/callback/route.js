import { NextResponse } from 'next/server';
import { setSessionCookie } from '../../../auth/session';
import { isAllowed, isAdmin } from '../../../auth/allowlist';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');

  const { origin } = new URL(request.url);
  const cleanAppUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;

  if (errorParam) {
    console.error('Google OAuth redirect error:', errorParam);
    return NextResponse.redirect(`${cleanAppUrl}/login?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${cleanAppUrl}/login?error=MissingCode`);
  }

  try {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    const redirect_uri = `${cleanAppUrl}/api/auth/callback`.replace(/([^:]\/)\/+/g, '$1');

    // 1. Exchange authorization code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Failed to exchange token:', errText);
      return NextResponse.redirect(`${app_url}/login?error=TokenExchangeFailed`);
    }

    const { access_token } = await tokenResponse.json();

    // 2. Fetch user profile from Google UserInfo endpoint
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!userinfoResponse.ok) {
      console.error('Failed to fetch userinfo');
      return NextResponse.redirect(`${app_url}/login?error=FetchUserInfoFailed`);
    }

    const userProfile = await userinfoResponse.json();
    const { email, name, picture, email_verified } = userProfile;

    if (!email || !email_verified) {
      return NextResponse.redirect(`${app_url}/login?error=EmailNotVerified`);
    }

    // 3. Check against allowlist
    if (!isAllowed(email)) {
      return NextResponse.redirect(`${app_url}/login?error=Unauthorized&email=${encodeURIComponent(email)}`);
    }

    // 4. Create session and set cookie
    const role = isAdmin(email) ? 'admin' : 'user';
    setSessionCookie({
      email,
      name: name || email.split('@')[0],
      picture: picture || '',
      role
    });

    // 5. Redirect back to application home
    return NextResponse.redirect(`${app_url}/`);
  } catch (error) {
    console.error('Authentication callback error:', error);
    return NextResponse.redirect(`${app_url}/login?error=InternalError`);
  }
}
