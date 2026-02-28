// Notification utility functions - Production Ready
import { checkTauriEnvironment, sendTauriNotification, isTauriApp } from './tauriNotifications';

let notificationsEnabled = true;
let notificationVolume = 0.5;
let audioContext = null;
let audioBuffer = null;
let audioLoaded = false;
let lastNotificationTime = 0;
const NOTIFICATION_THROTTLE_MS = 1000; // Max 1 notification per second

// Get or create audio context
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Load audio buffer (called on first interaction)
const loadAudioBuffer = async () => {
  if (audioLoaded) return true;
  
  try {
    const ctx = getAudioContext();
    const response = await fetch('/notification.mp3');
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    audioLoaded = true;
    console.log('✅ Audio buffer loaded successfully');
    return true;
  } catch (err) {
    console.error('❌ Failed to load audio buffer:', err);
    return false;
  }
};

// Initialize the notification sound
export const initNotificationSound = () => {
  try {
    notificationVolume = parseFloat(localStorage.getItem('notificationVolume') || '0.5');
    console.log('✅ Notification system initialized at', Math.round(notificationVolume * 100) + '% volume');
  } catch (err) {
    console.error('❌ Failed to initialize notification sound:', err);
  }
};

// Set notification volume (0.0 to 1.0)
export const setNotificationVolume = (volume) => {
  notificationVolume = Math.max(0, Math.min(1, volume));
  localStorage.setItem('notificationVolume', notificationVolume.toString());
  console.log('🔊 Notification volume set to', Math.round(notificationVolume * 100) + '%');
};

// Get notification volume
export const getNotificationVolume = () => {
  return notificationVolume;
};

// Unlock audio on user interaction
export const unlockAudio = async () => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Load audio buffer
    await loadAudioBuffer();
    
    console.log('🔓 Audio unlocked and buffer loaded');
  } catch (err) {
    console.warn('⚠️ Audio unlock failed:', err);
  }
};

// Play notification sound - Works even in background tabs using Web Audio API
export const playNotificationSound = async () => {
  console.log('🔔 playNotificationSound called');
  console.log('🔔 Tab visible:', !document.hidden, 'Has focus:', document.hasFocus());
  
  if (!notificationsEnabled) {
    console.log('🔇 Notifications disabled by user');
    return;
  }
  
  // Throttle notifications
  const now = Date.now();
  if (now - lastNotificationTime < NOTIFICATION_THROTTLE_MS) {
    console.log('⏱️ Notification throttled');
    return;
  }
  lastNotificationTime = now;
  
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      console.log('⏸️ Audio context suspended, attempting resume...');
      await ctx.resume();
    }
    
    // Load buffer if not loaded
    if (!audioLoaded) {
      console.log('📥 Audio buffer not loaded, loading now...');
      const loaded = await loadAudioBuffer();
      if (!loaded) {
        console.error('❌ Failed to load audio buffer');
        return;
      }
    }
    
    // Create buffer source
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create gain node for volume control
    const gainNode = ctx.createGain();
    gainNode.gain.value = notificationVolume;
    
    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    console.log('🎵 Playing sound at volume:', notificationVolume, 'Context state:', ctx.state);
    
    // Play
    source.start(0);
    console.log('✅✅✅ SOUND PLAYED SUCCESSFULLY');
    
  } catch (err) {
    console.error('❌ Exception in playNotificationSound:', err.name, err.message);
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
};

// Show browser notification
export const showNotification = async (title, options = {}) => {
  if (!notificationsEnabled) return;
  
  // Try Tauri notification first
  if (isTauriApp()) {
    const sent = await sendTauriNotification(title, options.body || '');
    if (sent) return;
  }
  
  // Fall back to web notification
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }
};

// Show notification for new message
export const notifyNewMessage = (author, message, channelName, isDM = false) => {
  console.log('📬 notifyNewMessage called:', { author, channelName, isDM });
  const title = isDM ? `${author}` : `${author} in #${channelName}`;
  const body = message.length > 100 ? message.substring(0, 100) + '...' : message;
  
  showNotification(title, {
    body,
    tag: 'message',
  });
  
  playNotificationSound();
};

// Show notification for mention
export const notifyMention = (author, message, channelName) => {
  console.log('📢 notifyMention called:', { author, channelName });
  const title = `${author} mentioned you in #${channelName}`;
  const body = message.length > 100 ? message.substring(0, 100) + '...' : message;
  
  showNotification(title, {
    body,
    tag: 'mention',
    requireInteraction: true,
  });
  
  playNotificationSound();
};

// Show notification for DM
export const notifyDM = (author, message) => {
  console.log('💬💬💬 notifyDM called:', { 
    author, 
    message: message.substring(0, 50),
    notificationsEnabled,
    tabHidden: document.hidden,
    hasFocus: document.hasFocus()
  });
  
  const title = `${author}`;
  const body = message.length > 100 ? message.substring(0, 100) + '...' : message;
  
  showNotification(title, {
    body,
    tag: 'dm',
  });
  
  console.log('💬 About to call playNotificationSound');
  playNotificationSound();
};

// Toggle notifications on/off
export const setNotificationsEnabled = (enabled) => {
  notificationsEnabled = enabled;
  localStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
};

// Get notification enabled state
export const getNotificationsEnabled = () => {
  const stored = localStorage.getItem('notificationsEnabled');
  return stored === null ? true : stored === 'true';
};

// Initialize notifications on app load
export const initNotifications = async () => {
  initNotificationSound();
  notificationsEnabled = getNotificationsEnabled();
  
  // Initialize audio on first user interaction (only once)
  let audioInitialized = false;
  const initAudio = async () => {
    if (audioInitialized) return;
    audioInitialized = true;
    
    await unlockAudio();
    console.log('🔓 Audio initialized on user interaction');
  };
  
  // Listen for first interaction
  const events = ['click', 'keydown', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, initAudio, { once: true, capture: true });
  });
  
  // Check if running in Tauri
  await checkTauriEnvironment();
  
  // Request permission if not already granted
  if (notificationsEnabled) {
    await requestNotificationPermission();
  }
};
