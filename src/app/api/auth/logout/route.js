import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../auth/session';

export async function GET() {
  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  clearSessionCookie();
  return NextResponse.redirect(`${app_url}/login`);
}
