import { NextResponse } from 'next/server';

export async function GET(request) {
  const { origin } = new URL(request.url);
  const cleanAppUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  
  const response = NextResponse.redirect(`${cleanAppUrl}/login`);
  response.cookies.delete('event_tracker_session');
  return response;
}
