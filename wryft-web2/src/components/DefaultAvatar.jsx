import React from 'react';

/**
 * DefaultAvatar component - renders a default profile picture with a customizable background color
 * Uses the Wryft logo with a colored background
 * @param {string} backgroundColor - Hex color for the background (default: #57F287 - green)
 * @param {string} className - Optional CSS class name
 * @param {object} style - Optional inline styles
 */
function DefaultAvatar({ backgroundColor = '#57F287', className = '', style = {} }) {
  return (
    <div 
      className={`default-avatar ${className}`}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style
      }}
    >
      <img 
        src="/defaultpfp.png" 
        alt="Default Avatar"
        style={{
          width: '70%',
          height: '70%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}

export default DefaultAvatar;
