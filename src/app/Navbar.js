'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ListTodo, PlusCircle, BarChart3, Sparkles, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.loggedIn) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to check navbar session:', err);
      }
    };
    
    checkSession();
  }, [pathname]); // Check on path changes

  const isLoginPage = pathname === '/login';

  const navLinks = [
    { href: '/', label: 'Submissions', icon: <ListTodo size={18} /> },
    { href: '/submit', label: 'Submit Event', icon: <PlusCircle size={18} /> },
    { href: '/dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> }
  ];

  return (
    <header className="navbar">
      <div className="nav-container">
        <Link href="/" className="logo">
          <Sparkles size={22} style={{ strokeWidth: 2.5 }} />
          <span>LOCAL MODS HUB</span>
        </Link>
        
        {!isLoginPage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <nav>
              <ul className="nav-links">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {user && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderLeft: '1px solid var(--border)',
                paddingLeft: '0.75rem',
                marginLeft: '0.25rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {user.name}
                  </span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 500,
                    color: user.role === 'admin' ? 'var(--warning)' : 'var(--text-muted)' 
                  }}>
                    {user.role === 'admin' ? '👑 Admin' : 'Mod'}
                  </span>
                </div>
                <a 
                  href="/api/auth/logout" 
                  className="nav-link" 
                  style={{ 
                    padding: '0.5rem', 
                    borderRadius: '50%', 
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }} 
                  title="Đăng xuất"
                >
                  <LogOut size={16} />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
