import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/storage';

// Initialize database tables
export async function GET() {
  try {
    const success = await initDatabase();
    
    if (success) {
      return NextResponse.json({ 
        message: 'Database initialized successfully',
        success: true 
      });
    } else {
      return NextResponse.json({ 
        message: 'Database initialization failed',
        success: false 
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
}

