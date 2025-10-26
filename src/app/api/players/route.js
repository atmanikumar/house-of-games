import { NextResponse } from 'next/server';
import { getPlayers } from '@/lib/storage';

// GET all players (public - no auth required for reading player stats)
export async function GET() {
  try {
    const players = await getPlayers();
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// Note: Players are managed through /api/users
// This endpoint is read-only for displaying player stats
