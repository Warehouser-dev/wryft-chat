/**
 * Storage utility that uses the backend MinIO/S3 API
 * Replaces Supabase storage with self-hosted solution
 */

// Get base URL without /api suffix
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_URL = VITE_API_URL.replace(/\/api$/, '');

/**
 * Upload a file to the backend storage
 * @param {File} file - The file to upload
 * @param {string} endpoint - The upload endpoint (avatar, banner, icon, emoji, attachment)
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
async function uploadFile(file, endpoint) {
  const formData = new FormData();
  formData.append('file', file);

  // Get JWT token from localStorage
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  const response = await fetch(`${API_URL}/api/upload/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const data = await response.json();
  return data.url;
}

/**
 * Upload an avatar image for a user
 * @param {File} file - The avatar image file
 * @returns {Promise<string>} - The public URL of the uploaded avatar
 */
export async function uploadUserAvatar(file) {
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar must be less than 5MB');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  return uploadFile(file, 'avatar');
}

/**
 * Upload a banner image for a guild or user
 * @param {File} file - The banner image file
 * @returns {Promise<string>} - The public URL of the uploaded banner
 */
export async function uploadBanner(file) {
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Banner must be less than 10MB');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  return uploadFile(file, 'banner');
}

/**
 * Upload an icon image for a guild
 * @param {File} file - The icon image file
 * @returns {Promise<string>} - The public URL of the uploaded icon
 */
export async function uploadIcon(file) {
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Icon must be less than 5MB');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  return uploadFile(file, 'icon');
}

/**
 * Upload an emoji image for a guild
 * @param {File} file - The emoji image file
 * @returns {Promise<string>} - The public URL of the uploaded emoji
 */
export async function uploadEmoji(file) {
  // Validate file size (max 256KB)
  if (file.size > 256 * 1024) {
    throw new Error('Emoji must be less than 256KB');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  return uploadFile(file, 'emoji');
}

/**
 * Upload an attachment for a message
 * @param {File} file - The attachment file
 * @returns {Promise<string>} - The public URL of the uploaded attachment
 */
export async function uploadAttachment(file) {
  // Validate file size (max 25MB)
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Attachment must be less than 25MB');
  }

  return uploadFile(file, 'attachment');
}
