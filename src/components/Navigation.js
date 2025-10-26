'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Navigation.module.css';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          House of Games
        </Link>
        <div className={styles.links}>
          <Link 
            href="/" 
            className={pathname === '/' ? styles.active : ''}
          >
            Dashboard
          </Link>
          <Link 
            href="/history" 
            className={pathname === '/history' ? styles.active : ''}
          >
            History
          </Link>
          {isAdmin() && (
            <Link 
              href="/users" 
              className={pathname === '/users' ? styles.active : ''}
            >
              Users
            </Link>
          )}
          <Link 
            href="/profile" 
            className={pathname === '/profile' ? styles.active : ''}
          >
            Profile
          </Link>
        </div>
        {user && (
          <div className={styles.userSection}>
            <span className={styles.userName}>
              {user.name} ({user.role})
            </span>
            <button onClick={logout} className={styles.logoutBtn}>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

