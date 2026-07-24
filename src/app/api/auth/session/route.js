import { NextResponse } from 'next/server';
import { getSession } from '../../../auth/session';

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }
  return NextResponse.json({ loggedIn: true, user: session });
}
