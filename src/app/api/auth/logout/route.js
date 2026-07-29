import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../auth/session';

export async function GET(request) {
  const { origin } = new URL(request.url);
  const cleanAppUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  clearSessionCookie();
  return NextResponse.redirect(`${cleanAppUrl}/login`);
}
