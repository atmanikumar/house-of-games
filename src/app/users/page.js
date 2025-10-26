'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function UsersPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'player'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin()) {
        router.push('/');
      } else {
        fetchUsers();
      }
    }
  }, [user, loading, router, isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUsers();
        setShowAddModal(false);
        setFormData({ username: '', password: '', name: '', role: 'player' });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create user');
      }
    } catch (error) {
      setError('Failed to create user');
    }
  };


  if (loading || isLoading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Loading users...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin()) {
    return null;
  }

  return (
    <div className={styles.usersPage}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>👥 User Management</h1>
            <p className={styles.subtitle}>Manage admin and player accounts</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <span style={{ color: 'white' }}>➕</span> Add User
          </button>
        </div>

        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`badge ${
                        u.role === 'admin' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.createdAt ? (
                        new Date(u.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Add New User</h2>
            
            <form onSubmit={handleAddUser}>
              {error && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Login username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="player">Player</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    setFormData({ username: '', password: '', name: '', role: 'player' });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

