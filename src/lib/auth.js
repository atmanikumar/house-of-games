import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Secret key for JWT - use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'vilayattu-veedu-secret-key-change-in-production';

// Initial admin credentials (only used for first-time database setup)
// After first login, these are stored in the database and can be changed
const INITIAL_ADMIN = {
  id: 'admin-1',
  username: 'mani',
  password: 'game@123', // Plain text, will be hashed
  role: 'admin',
  name: 'Mani'
};

// Hash password
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      name: user.name,
      profilePhoto: user.profilePhoto || null
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Initialize default admin (only called when database is empty)
export async function initDefaultAdmin() {
  const hashedPassword = await hashPassword(INITIAL_ADMIN.password);
  return {
    id: INITIAL_ADMIN.id,
    username: INITIAL_ADMIN.username,
    password: hashedPassword,
    role: INITIAL_ADMIN.role,
    name: INITIAL_ADMIN.name,
    createdAt: new Date().toISOString() // Use actual creation date
  };
}

// Get initial admin credentials (for display purposes only)
export function getInitialCredentials() {
  return {
    username: INITIAL_ADMIN.username,
    password: INITIAL_ADMIN.password
  };
}

