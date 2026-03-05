/**
 * Generate a consistent color for a user based on their ID or username
 * Similar to Discord's default avatar colors
 */

const AVATAR_COLORS = [
  '#5865F2', // Blurple
  '#57F287', // Green
  '#FEE75C', // Yellow
  '#EB459E', // Fuchsia
  '#ED4245', // Red
  '#2F6CCE', // Blue (original Wryft color)
];

/**
 * Generate a color hash from a string
 * @param {string} str - The string to hash (user ID or username)
 * @returns {string} - A hex color code
 */
export function getAvatarColor(str) {
  if (!str) return AVATAR_COLORS[5]; // Default to Wryft blue
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the hash to pick a color
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
