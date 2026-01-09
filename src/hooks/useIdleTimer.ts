import React, { useEffect, useRef, useState, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // in milliseconds
  onIdle: () => void;
  warningTime?: number; // warning time before logout (in milliseconds)
  onWarning?: () => void;
  events?: string[];
  paused?: boolean; // NEW: permet de mettre en pause le timer (ex: pendant un check-in)
}

export const useIdleTimer = ({
  timeout,
  onIdle,
  warningTime = 60000, // 1 minute warning by default
  onWarning,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  paused = false
}: UseIdleTimerOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastActiveRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    setIsIdle(false);
    setIsWarning(false);
    setRemainingTime(0);

    // Clear existing timeouts
    clearAllTimers();

    // Si en pause, ne pas démarrer de nouveaux timers
    if (paused) {
      console.log('⏸️ [IdleTimer] Timer en pause (formulaire actif)');
      return;
    }

    // Set warning timeout
    const warningTimeout = timeout - warningTime;
    if (warningTimeout > 0 && onWarning) {
      warningTimeoutRef.current = setTimeout(() => {
        setIsWarning(true);
        setRemainingTime(warningTime);
        
        // Start countdown
        intervalRef.current = setInterval(() => {
          setRemainingTime(prev => {
            if (prev <= 1000) {
              clearInterval(intervalRef.current);
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);

        onWarning();
      }, warningTimeout);
    }

    // Set idle timeout
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      setIsWarning(false);
      onIdle();
    }, timeout);
  }, [timeout, warningTime, onIdle, onWarning, paused, clearAllTimers]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Réinitialiser le timer quand paused change
  useEffect(() => {
    if (paused) {
      console.log('⏸️ [IdleTimer] Mise en pause du timer');
      clearAllTimers();
      setIsWarning(false);
      setRemainingTime(0);
    } else {
      console.log('▶️ [IdleTimer] Reprise du timer');
      resetTimer();
    }
  }, [paused, clearAllTimers, resetTimer]);

  useEffect(() => {
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start the timer (si pas en pause)
    if (!paused) {
      resetTimer();
    }

    return () => {
      // Clean up event listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });

      // Clear timeouts
      clearAllTimers();
    };
  }, [events, handleActivity, resetTimer, paused, clearAllTimers]);

  return {
    isIdle,
    isWarning,
    remainingTime: Math.ceil(remainingTime / 1000), // return in seconds
    resetTimer
  };
};
