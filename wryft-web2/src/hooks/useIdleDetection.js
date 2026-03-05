import { useEffect, useRef } from 'react';
import { api } from '../services/api';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const useIdleDetection = (currentStatus, onStatusChange) => {
  const idleTimerRef = useRef(null);
  const wasIdleRef = useRef(false);

  const resetIdleTimer = () => {
    // Clear existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // If user was idle and is now active, set back to their previous status
    if (wasIdleRef.current && currentStatus === 'idle') {
      const previousStatus = localStorage.getItem('statusBeforeIdle') || 'online';
      wasIdleRef.current = false;
      onStatusChange(previousStatus);
    }

    // Don't set idle timer if user is offline or DND
    if (currentStatus === 'offline' || currentStatus === 'dnd') {
      return;
    }

    // Set new idle timer
    idleTimerRef.current = setTimeout(() => {
      // Save current status before going idle
      if (currentStatus !== 'idle') {
        localStorage.setItem('statusBeforeIdle', currentStatus);
      }
      wasIdleRef.current = true;
      onStatusChange('idle');
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    // Activity events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Start initial timer
    resetIdleTimer();

    // Cleanup
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [currentStatus]);

  return { resetIdleTimer };
};
