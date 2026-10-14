import { imageUploadService } from '../lib/imageUpload';

describe('Image Upload Integration', () => {
  test('Camera permission', async () => {
    const hasPermission = await imageUploadService.checkCameraPermission();
    expect(typeof hasPermission).toBe('boolean');
  });

  test('Image upload to Supabase', async () => {
    // Mock image selection
    const mockImage = {
      uri: 'file:///mock/image.jpg',
      type: 'image/jpeg'
    };
    
    const result = await imageUploadService.uploadImage(mockImage, 'test-patient');
    expect(result.error).toBeNull();
    expect(result.url).toContain('supabase');
  });
});