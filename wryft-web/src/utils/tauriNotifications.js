// Tauri-specific notification utilities

let isTauri = false;
let tauriNotification = null;

// Check if running in Tauri
export const checkTauriEnvironment = async () => {
  try {
    // Check if __TAURI__ is available
    if (typeof window !== 'undefined' && window.__TAURI__) {
      isTauri = true;
      console.log('✅ Running in Tauri environment');
      
      try {
        // Import the notification module
        tauriNotification = await import('@tauri-apps/plugin-notification');
        console.log('✅ Tauri notification plugin loaded:', Object.keys(tauriNotification));
        
        // Request permission immediately
        try {
          const permGranted = await tauriNotification.isPermissionGranted();
          console.log('📬 Notification permission granted:', permGranted);
          
          if (!permGranted) {
            const perm = await tauriNotification.requestPermission();
            console.log('📬 Requested permission, result:', perm);
          }
        } catch (permErr) {
          console.error('Permission check failed:', permErr);
        }
        
        return true;
      } catch (err) {
        console.warn('⚠️ Tauri notification plugin not available:', err);
        isTauri = false;
      }
    } else {
      console.log('ℹ️ Not running in Tauri - __TAURI__ not found');
    }
  } catch (err) {
    console.log('ℹ️ Not running in Tauri:', err.message);
  }
  return false;
};

// Send native Tauri notification
export const sendTauriNotification = async (title, body) => {
  if (!isTauri || !tauriNotification) {
    console.log('⚠️ Tauri not available for notification');
    return false;
  }
  
  try {
    console.log('📬 Attempting to send Tauri notification:', title, body);
    
    // Use the sendNotification function
    await tauriNotification.sendNotification({
      title: title,
      body: body || '',
    });
    
    console.log('✅ Tauri notification sent successfully');
    return true;
  } catch (err) {
    console.error('❌ Failed to send Tauri notification:', err);
    return false;
  }
};

// Set badge count (macOS dock badge)
export const setTauriBadgeCount = async (count) => {
  if (!isTauri) return;
  
  try {
    console.log('🔢 Attempting to set badge count:', count);
    // Try to import app module
    const tauriApi = await import('@tauri-apps/api/app');
    if (tauriApi && typeof tauriApi.setAppBadge === 'function') {
      await tauriApi.setAppBadge(count > 0 ? count : null);
      console.log('✅ Tauri badge count set:', count);
    } else {
      console.log('ℹ️ setAppBadge function not available');
    }
  } catch (err) {
    if (isTauri) {
      console.log('ℹ️ Badge count not supported on this platform:', err.message);
    }
  }
};

export const isTauriApp = () => isTauri;
