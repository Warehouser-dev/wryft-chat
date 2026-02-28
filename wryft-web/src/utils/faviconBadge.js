// Favicon badge for unread notifications

let canvas = null;
let ctx = null;
let originalFavicon = null;

// Initialize canvas for drawing badges
const initCanvas = () => {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    ctx = canvas.getContext('2d');
  }
};

// Get the original favicon
const getOriginalFavicon = () => {
  if (!originalFavicon) {
    const link = document.querySelector("link[rel*='icon']");
    originalFavicon = link ? link.href : '/wryftchat.png';
  }
  return originalFavicon;
};

// Draw badge on favicon
const drawBadge = (count, isMention = false) => {
  initCanvas();
  
  // Clear canvas
  ctx.clearRect(0, 0, 32, 32);
  
  // Try to load the actual favicon
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = getOriginalFavicon();
  
  const drawBadgeOnly = () => {
    if (count > 0) {
      // Draw badge circle - MUCH BIGGER
      const badgeSize = count > 9 ? 28 : 24;
      const x = 32 - badgeSize / 2 - 1;
      const y = badgeSize / 2 + 1;
      
      // Badge background
      ctx.fillStyle = isMention ? '#0b64f4' : '#0b64f4';
      ctx.beginPath();
      ctx.arc(x, y, badgeSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Badge border - thicker
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Badge text - bigger font
      ctx.fillStyle = '#ffffff';
      ctx.font = count > 9 ? 'bold 14px Arial' : 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = count > 99 ? '99+' : count.toString();
      ctx.fillText(text, x, y);
    }
    
    // Update favicon
    updateFavicon(canvas.toDataURL());
    console.log('🎨 Favicon badge updated with count:', count);
  };
  
  img.onload = () => {
    // Draw the actual favicon
    ctx.drawImage(img, 0, 0, 32, 32);
    drawBadgeOnly();
  };
  
  img.onerror = () => {
    // Fallback: Draw a simple icon (W for Wryft)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 32, 32);
    
    ctx.fillStyle = '#0b64f4';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W', 16, 16);
    
    drawBadgeOnly();
  };
};

// Update the favicon link
const updateFavicon = (dataUrl) => {
  let link = document.querySelector("link[rel*='icon']");
  
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  
  link.href = dataUrl;
};

// Clear badge (restore original favicon)
export const clearFaviconBadge = () => {
  const link = document.querySelector("link[rel*='icon']");
  if (link) {
    link.href = getOriginalFavicon();
  }
};

// Update favicon badge with count
export const updateFaviconBadge = (count, hasMentions = false) => {
  if (count === 0) {
    clearFaviconBadge();
  } else {
    drawBadge(count, hasMentions);
  }
};

// Update badge based on unread counts
export const updateFaviconFromUnreads = (unreads, mentions) => {
  const totalUnread = Object.values(unreads).reduce((sum, count) => sum + count, 0);
  const totalMentions = Object.values(mentions).reduce((sum, count) => sum + count, 0);
  
  updateFaviconBadge(totalUnread, totalMentions > 0);
};
