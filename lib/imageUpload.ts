import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  error?: string;
}

/**
 * Image Upload Service for Patient Photos
 * Uses Expo ImagePicker and Supabase Storage
 */
export class ImageUploadService {
  private static instance: ImageUploadService;
  
  static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  /**
   * Request camera and media library permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        return cameraStatus === 'granted' && libraryStatus === 'granted';
      }
      return true; // Web doesn't need explicit permissions
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Pick image from camera
   */
  async pickFromCamera(): Promise<UploadResult> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return { url: '', error: 'Camera permissions required' };
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: false,
      });

      if (result.canceled || !result.assets[0]) {
        return { url: '', error: 'Camera capture cancelled' };
      }

      return await this.uploadImage(result.assets[0].uri, 'camera');
    } catch (error) {
      console.error('Camera capture failed:', error);
      return { url: '', error: 'Failed to capture photo' };
    }
  }

  /**
   * Pick image from gallery
   */
  async pickFromGallery(): Promise<UploadResult> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return { url: '', error: 'Gallery permissions required' };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: false,
      });

      if (result.canceled || !result.assets[0]) {
        return { url: '', error: 'Image selection cancelled' };
      }

      return await this.uploadImage(result.assets[0].uri, 'gallery');
    } catch (error) {
      console.error('Gallery selection failed:', error);
      return { url: '', error: 'Failed to select image' };
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  private async uploadImage(uri: string, source: 'camera' | 'gallery'): Promise<UploadResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `patient_${source}_${timestamp}_${randomId}.jpg`;
      
      // Convert URI to blob for upload
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('patient-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return { url: '', error: 'Failed to upload image' };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('patient-images')
        .getPublicUrl(fileName);

      return { url: publicUrl };
    } catch (error) {
      console.error('Upload failed:', error);
      return { url: '', error: 'Upload service unavailable' };
    }
  }

  /**
   * Delete image from Supabase Storage
   */
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error } = await supabase.storage
        .from('patient-images')
        .remove([fileName]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  /**
   * Get default avatar URL (fallback)
   */
  getDefaultAvatar(): string {
    // Use a reliable avatar service as fallback
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Validate image file
   */
  private validateImage(uri: string): boolean {
    // Basic validation - in production you'd want more thorough checks
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = uri.split('.').pop()?.toLowerCase();
    
    return validExtensions.includes(`.${extension}`) || uri.includes('data:image');
  }
}

// Export singleton instance
export const imageUploadService = ImageUploadService.getInstance();

// Helper functions for UI
export const showImagePickerOptions = async (): Promise<UploadResult> => {
  // In a real app, you'd show an action sheet with camera/gallery options
  // For now, we'll default to gallery
  return await imageUploadService.pickFromGallery();
};

export const uploadPatientPhoto = async (source: 'camera' | 'gallery' = 'gallery'): Promise<string> => {
  const result = source === 'camera' 
    ? await imageUploadService.pickFromCamera()
    : await imageUploadService.pickFromGallery();

  if (result.error) {
    throw new Error(result.error);
  }

  return result.url;
};
