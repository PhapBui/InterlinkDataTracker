import { getSession } from '../auth/session';
import { redirect } from 'next/navigation';

export default function ProtectedLayout({ children }) {
  const session = getSession();
  if (!session) {
    redirect('/login');
  }
  return children;
}
