'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ListTodo, PlusCircle, BarChart3, Sparkles } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

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
      </div>
    </header>
  );
}
