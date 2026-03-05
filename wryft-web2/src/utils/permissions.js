// Permission constants (must match backend)
export const PERMISSIONS = {
  ADMINISTRATOR: 0x0001,
  MANAGE_GUILD: 0x0002,
  MANAGE_ROLES: 0x0004,
  MANAGE_CHANNELS: 0x0008,
  KICK_MEMBERS: 0x0010,
  BAN_MEMBERS: 0x0020,
  CREATE_INVITE: 0x0040,
  MANAGE_MESSAGES: 0x0080,
  SEND_MESSAGES: 0x0100,
  READ_MESSAGES: 0x0200,
  MENTION_EVERYONE: 0x0400,
  MANAGE_NICKNAMES: 0x0800,
  CONNECT_VOICE: 0x1000,
  SPEAK_VOICE: 0x2000,
  MUTE_MEMBERS: 0x4000,
  DEAFEN_MEMBERS: 0x8000,
};

// Default permissions for @everyone role
export const DEFAULT_PERMISSIONS = 
  PERMISSIONS.SEND_MESSAGES | 
  PERMISSIONS.READ_MESSAGES | 
  PERMISSIONS.CREATE_INVITE | 
  PERMISSIONS.CONNECT_VOICE | 
  PERMISSIONS.SPEAK_VOICE;

// Permission names for UI
export const PERMISSION_NAMES = {
  [PERMISSIONS.ADMINISTRATOR]: 'Administrator',
  [PERMISSIONS.MANAGE_GUILD]: 'Manage Server',
  [PERMISSIONS.MANAGE_ROLES]: 'Manage Roles',
  [PERMISSIONS.MANAGE_CHANNELS]: 'Manage Channels',
  [PERMISSIONS.KICK_MEMBERS]: 'Kick Members',
  [PERMISSIONS.BAN_MEMBERS]: 'Ban Members',
  [PERMISSIONS.CREATE_INVITE]: 'Create Invite',
  [PERMISSIONS.MANAGE_MESSAGES]: 'Manage Messages',
  [PERMISSIONS.SEND_MESSAGES]: 'Send Messages',
  [PERMISSIONS.READ_MESSAGES]: 'Read Messages',
  [PERMISSIONS.MENTION_EVERYONE]: 'Mention Everyone',
  [PERMISSIONS.MANAGE_NICKNAMES]: 'Manage Nicknames',
  [PERMISSIONS.CONNECT_VOICE]: 'Connect to Voice',
  [PERMISSIONS.SPEAK_VOICE]: 'Speak in Voice',
  [PERMISSIONS.MUTE_MEMBERS]: 'Mute Members',
  [PERMISSIONS.DEAFEN_MEMBERS]: 'Deafen Members',
};

// Permission descriptions
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.ADMINISTRATOR]: 'All permissions, bypasses all checks',
  [PERMISSIONS.MANAGE_GUILD]: 'Edit guild settings and information',
  [PERMISSIONS.MANAGE_ROLES]: 'Create, edit, and delete roles',
  [PERMISSIONS.MANAGE_CHANNELS]: 'Create, edit, and delete channels',
  [PERMISSIONS.KICK_MEMBERS]: 'Remove members from the server',
  [PERMISSIONS.BAN_MEMBERS]: 'Ban members from the server',
  [PERMISSIONS.CREATE_INVITE]: 'Create invite links',
  [PERMISSIONS.MANAGE_MESSAGES]: 'Delete messages from other users',
  [PERMISSIONS.SEND_MESSAGES]: 'Send messages in text channels',
  [PERMISSIONS.READ_MESSAGES]: 'Read messages in text channels',
  [PERMISSIONS.MENTION_EVERYONE]: 'Use @everyone and @here mentions',
  [PERMISSIONS.MANAGE_NICKNAMES]: 'Change other members\' nicknames',
  [PERMISSIONS.CONNECT_VOICE]: 'Connect to voice channels',
  [PERMISSIONS.SPEAK_VOICE]: 'Speak in voice channels',
  [PERMISSIONS.MUTE_MEMBERS]: 'Mute members in voice channels',
  [PERMISSIONS.DEAFEN_MEMBERS]: 'Deafen members in voice channels',
};

// Check if a permission bitfield has a specific permission
export function hasPermission(permissions, permission) {
  // Administrator has all permissions
  if (permissions & PERMISSIONS.ADMINISTRATOR) {
    return true;
  }
  return (permissions & permission) === permission;
}

// Add a permission to a bitfield
export function addPermission(permissions, permission) {
  return permissions | permission;
}

// Remove a permission from a bitfield
export function removePermission(permissions, permission) {
  return permissions & ~permission;
}

// Toggle a permission in a bitfield
export function togglePermission(permissions, permission) {
  return permissions ^ permission;
}

// Get all permissions from a bitfield as an array
export function getPermissionsArray(permissions) {
  const perms = [];
  for (const [key, value] of Object.entries(PERMISSIONS)) {
    if (hasPermission(permissions, value)) {
      perms.push({ key, value, name: PERMISSION_NAMES[value] });
    }
  }
  return perms;
}

// Calculate combined permissions from multiple roles
export function calculatePermissions(roles) {
  let permissions = 0;
  for (const role of roles) {
    permissions |= role.permissions;
  }
  return permissions;
}

// Check if user has permission based on their roles
export function userHasPermission(userRoles, permission) {
  const totalPermissions = calculatePermissions(userRoles);
  return hasPermission(totalPermissions, permission);
}

// Get highest role (by position)
export function getHighestRole(roles) {
  if (!roles || roles.length === 0) return null;
  return roles.reduce((highest, role) => 
    role.position > highest.position ? role : highest
  );
}

// Get role color (from highest role with a color)
export function getRoleColor(roles) {
  if (!roles || roles.length === 0) return '#99aab5';
  
  // Sort by position descending
  const sorted = [...roles].sort((a, b) => b.position - a.position);
  
  // Find first role with a non-default color
  for (const role of sorted) {
    if (role.color && role.color !== '#99aab5') {
      return role.color;
    }
  }
  
  return '#99aab5';
}
