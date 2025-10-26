import { NextResponse } from 'next/server';
import { getGames, saveGames } from '@/lib/storage';

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

// POST/PUT update games
export async function POST(request) {
  try {
    const games = await request.json();
    console.log(`💾 Attempting to save ${games.length} games...`);
    const result = await saveGames(games);
    
    if (!result) {
      console.error('❌ saveGames returned false');
      return NextResponse.json({ success: false, error: 'Save failed' }, { status: 500 });
    }
    
    console.log(`✅ Successfully saved ${games.length} games`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error saving games:', error.message, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

