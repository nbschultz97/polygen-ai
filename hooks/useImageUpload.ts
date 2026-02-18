import { useState, useCallback } from 'react';
import type { ImageData } from '../types';

export function useImageUpload() {
  const [attachedImage, setAttachedImage] = useState<ImageData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setAttachedImage({
        base64: base64Data,
        mimeType: file.type,
      });
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearAttachedImage = useCallback(() => {
    setAttachedImage(null);
    setImagePreview(null);
  }, []);

  return {
    attachedImage,
    imagePreview,
    handleImageUpload,
    clearAttachedImage,
  };
}
