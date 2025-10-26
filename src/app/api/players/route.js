import { NextResponse } from 'next/server';
import { getPlayers, getUsers } from '@/lib/storage';

// GET all players (public - no auth required for reading player stats)
export async function GET() {
  try {
    const players = await getPlayers();
    const users = await getUsers();
    
    // Merge players with their profile photos from users table
    const playersWithPhotos = players.map(player => {
      const user = users.find(u => u.id === player.id);
      return {
        ...player,
        profilePhoto: user?.profilePhoto || null
      };
    });
    
    return NextResponse.json(playersWithPhotos);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

// Note: Players are managed through /api/users
// This endpoint is read-only for displaying player stats
