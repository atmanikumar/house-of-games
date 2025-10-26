import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/auth';
import { updateUserProfilePhoto } from '@/lib/storage';

export async function POST(request) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the file from form data
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size exceeds 10MB limit' 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`profile-photos/${decoded.id}-${Date.now()}.${file.type.split('/')[1]}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Update user's profile photo in database
    const success = await updateUserProfilePhoto(decoded.id, blob.url);

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to update profile photo in database' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      photoUrl: blob.url,
      message: 'Profile photo updated successfully'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to upload profile photo',
      details: error.message 
    }, { status: 500 });
  }
}

