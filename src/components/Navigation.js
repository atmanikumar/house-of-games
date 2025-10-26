'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Navigation.module.css';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install button
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      // Hide the install button after installation
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
  };

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
          {showInstallButton && (
            <button 
              onClick={handleInstallClick}
              className={styles.installBtn}
              title="Install App"
            >
              📱 Install
            </button>
          )}
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

