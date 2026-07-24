import { NextResponse } from 'next/server';
import { setSessionCookie } from '../../../auth/session';
import { isAllowed, isAdmin } from '../../../auth/allowlist';

export async function POST(request) {
  // Prevent mock login in production if Google Auth is set up
  const client_id = process.env.GOOGLE_CLIENT_ID;
  if (client_id && client_id.trim() !== '' && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Developer Mock Login is disabled in production with active Google credentials.' 
    }, { status: 403 });
  }

  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ status: 'error', message: 'Vui lòng điền địa chỉ email hợp lệ.' });
    }

    if (!isAllowed(email)) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Tài khoản email này không nằm trong danh sách được phép truy cập (Allowlist).' 
      });
    }

    const role = isAdmin(email) ? 'admin' : 'user';
    setSessionCookie({
      email: email.trim().toLowerCase(),
      name: email.split('@')[0],
      picture: '',
      role
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
