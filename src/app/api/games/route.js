import { NextResponse } from 'next/server';
import { getGames, saveGames, updateGameInDB } from '@/lib/storage';

// GET all games
export async function GET() {
  try {
    const games = await getGames();
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Create a new game (INSERT)
export async function POST(request) {
  try {
    const game = await request.json();
    
    if (!game.id || !game.type) {
      return NextResponse.json({ success: false, error: 'Game ID and type required' }, { status: 400 });
    }
    
    console.log(`➕ Attempting to create ${game.type} game ${game.id}...`);
    const result = await updateGameInDB(game); // Uses INSERT OR REPLACE under the hood
    
    if (!result) {
      console.error('❌ Failed to create game');
      return NextResponse.json({ success: false, error: 'Create failed' }, { status: 500 });
    }
    
    console.log(`✅ Successfully created game ${game.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error creating game:', error.message, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH - Update a specific game
export async function PATCH(request) {
  try {
    const game = await request.json();
    
    if (!game.id || !game.type) {
      return NextResponse.json({ success: false, error: 'Game ID and type required' }, { status: 400 });
    }
    
    console.log(`🔄 Attempting to update ${game.type} game ${game.id}...`);
    const result = await updateGameInDB(game);
    
    if (!result) {
      console.error('❌ updateGameInDB returned false');
      return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
    }
    
    console.log(`✅ Successfully updated game ${game.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating game:', error.message, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


