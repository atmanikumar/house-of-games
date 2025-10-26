'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import styles from './page.module.css';

export default function ProfilePage() {
  const { user, loading, checkAuth } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [players, setPlayers] = useState([]);
  
  // Image crop states
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    aspect: 1, // Square crop
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch players to get avatar
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players');
        if (response.ok) {
          const data = await response.json();
          setPlayers(data);
        }
      } catch (error) {
        // Silent fail
      }
    };
    fetchPlayers();
  }, []);

  // Convert crop to blob
  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = completedCrop.width * scaleX * pixelRatio;
    canvas.height = completedCrop.height * scaleY * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  }, [completedCrop]);

  // Early returns after all hooks are defined
  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    setError('');
    setSuccess('');

    // Create preview URL
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setSelectedImage(reader.result);
    });
    reader.readAsDataURL(file);
  };

  // Upload cropped image
  const handleUpload = async () => {
    try {
      setUploading(true);
      setError('');
      setSuccess('');

      // Get cropped image blob
      const croppedBlob = await getCroppedImg();
      if (!croppedBlob) {
        setError('Please select and crop an image');
        setUploading(false);
        return;
      }

      // Check blob size
      if (croppedBlob.size > 10 * 1024 * 1024) {
        setError('Cropped image is too large. Please crop a smaller area.');
        setUploading(false);
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append('photo', croppedBlob, 'profile-photo.jpg');

      // Upload to API
      const response = await fetch('/api/profile/upload-photo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess('Profile photo updated successfully!');
      setSelectedImage(null);
      setCompletedCrop(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh user data
      await checkAuth();

    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
    setCompletedCrop(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Profile Settings</h1>

        <div className={styles.profileInfo}>
          <div className={styles.photoSection}>
            <div className={styles.currentPhoto}>
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className={styles.profileImage} />
              ) : (
                <div className={styles.placeholderPhoto}>
                  {players.find(p => p.id === user.id)?.avatar || '👤'}
                </div>
              )}
            </div>
          </div>

          <div className={styles.userDetails}>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
        </div>

        <div className={styles.uploadSection}>
          <h2 className={styles.subtitle}>Update Profile Photo</h2>
          <p className={styles.description}>
            Maximum file size: 10MB. Allowed formats: JPG, PNG, WebP
          </p>

          {!selectedImage ? (
            <div className={styles.fileInputWrapper}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className={styles.fileInput}
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className={styles.fileLabel}>
                Choose Photo
              </label>
            </div>
          ) : (
            <div className={styles.cropSection}>
              <div className={styles.cropContainer}>
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={selectedImage}
                    alt="Crop preview"
                    className={styles.cropImage}
                  />
                </ReactCrop>
              </div>

              <div className={styles.cropActions}>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !completedCrop}
                  className={styles.uploadButton}
                >
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={uploading}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
        </div>
      </div>
    </div>
  );
}

