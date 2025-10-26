import { NextResponse } from 'next/server';
import { verifyPassword, generateToken, initDefaultAdmin } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getUsers, saveUsers, getPlayers, savePlayers } from '@/lib/storage';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Get users from storage
    let users = await getUsers();
    
    // If no users exist, initialize with default admin
    if (users.length === 0) {
      const admin = await initDefaultAdmin();
      users = [admin];
      await saveUsers(users);
      
      // Also add admin as a player (check if not already exists)
      let players = await getPlayers();
      const adminExists = players.find(p => p.id === admin.id);
      if (!adminExists) {
        const adminPlayer = {
          id: admin.id,
          name: admin.name,
          avatar: '👑', // Crown for admin
          wins: 0,
          gamesPlayed: 0,
          winPercentage: 0,
          rank: 0,
        };
        players.push(adminPlayer);
        await savePlayers(players);
      }
    }

    // Find user
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken(user);

    // Set cookie
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    // Return user data (without password)
    const { password: _, ...userData } = user;
    
    return NextResponse.json({
      success: true,
      user: userData
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

