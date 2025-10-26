'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Login failed');
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loginPage}>
        <div className="container">
          <div className={styles.loginCard}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className={styles.loginPage}>
      <div className="container">
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <h1 className={styles.title}>House of Games</h1>
          </div>

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

