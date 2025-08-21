import React, { useEffect, useRef, useState, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // in milliseconds
  onIdle: () => void;
  warningTime?: number; // warning time before logout (in milliseconds)
  onWarning?: () => void;
  events?: string[];
}

export const useIdleTimer = ({
  timeout,
  onIdle,
  warningTime = 60000, // 1 minute warning by default
  onWarning,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
}: UseIdleTimerOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastActiveRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    setIsIdle(false);
    setIsWarning(false);
    setRemainingTime(0);

    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

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
  }, [timeout, warningTime, onIdle, onWarning]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start the timer
    resetTimer();

    return () => {
      // Clean up event listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });

      // Clear timeouts
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [events, handleActivity, resetTimer]);

  return {
    isIdle,
    isWarning,
    remainingTime: Math.ceil(remainingTime / 1000), // return in seconds
    resetTimer
  };
};