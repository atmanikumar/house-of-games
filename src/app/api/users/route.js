import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, hashPassword, initDefaultAdmin } from '@/lib/auth';
import { getUsers, saveUsers, getPlayers, savePlayers } from '@/lib/storage';

// GET all users (admin only)
export async function GET() {
  try {
    const token = cookies().get('auth-token')?.value;
    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    let users = await getUsers();
    
    // Initialize with default admin if empty
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
          totalGames: 0,
          winPercentage: 0,
          rank: 0,
        };
        players.push(adminPlayer);
        await savePlayers(players);
      }
    }

    // Merge users with their player stats
    const players = await getPlayers();
    const usersWithStats = users.map(user => {
      const playerData = players.find(p => p.id === user.id);
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        // Player stats
        avatar: playerData?.avatar || '👤',
        wins: playerData?.wins || 0,
        gamesPlayed: playerData?.gamesPlayed || 0,
        totalGames: playerData?.totalGames || 0,
        winPercentage: playerData?.winPercentage || 0,
        rank: playerData?.rank || 0
      };
    });

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST create new user (admin only)
export async function POST(request) {
  try {
    const token = cookies().get('auth-token')?.value;
    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { username, password, name, role } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password, and name required' },
        { status: 400 }
      );
    }

    let users = await getUsers();

    // Check if username already exists
    if (users.find(u => u.username === username)) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = {
      id: `user-${Date.now()}`,
      username,
      password: hashedPassword,
      name,
      role: role || 'player',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    console.log('💾 Saving new user:', { ...newUser, password: '[REDACTED]' });
    const saveResult = await saveUsers(users);
    if (!saveResult) {
      console.error('❌ Failed to save users to database');
      return NextResponse.json(
        { error: 'Failed to save user to database' },
        { status: 500 }
      );
    }
    console.log('✅ User saved successfully');

    // Also add as a player for game tracking (check if not already exists)
    let players = await getPlayers();
    const playerExists = players.find(p => p.id === newUser.id);
    
    if (!playerExists) {
      // Generate random superhero avatar
      const avatars = ['🦸‍♂️', '🦹‍♂️', '🕷️', '🦇', '⚡', '💪', '🔥', '⭐', '🎯', '🏆', '👊', '🛡️', '⚔️', '🎪', '🎭', '🎬'];
      const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
      
      const newPlayer = {
        id: newUser.id,
        name: newUser.name,
        avatar: randomAvatar,
        wins: 0,
        gamesPlayed: 0,
        winPercentage: 0,
        rank: 0,
      };
      
      players.push(newPlayer);
      await savePlayers(players);
    }

    // Return user without password
    const { password: _, ...safeUser } = newUser;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}


