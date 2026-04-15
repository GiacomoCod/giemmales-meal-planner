import { useState, useRef, useCallback, useEffect } from 'react';

interface SwipeToDismissResult {
  transform: string;
  isDragging: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
}

interface SwipeGestureState {
  startY: number | null;
  currentY: number;
}

export function useSwipeToDismiss(
  onDismiss: () => void,
  threshold: number = 100, // pixels downwards to dismiss
  isActive: boolean = true // whether the sheet is currently fully active/open
): SwipeToDismissResult {
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const translateYRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const gestureStateRef = useRef<SwipeGestureState>({ startY: null, currentY: 0 });
  
  // Lock background body scroll ONLY while the bottom sheet is active
  useEffect(() => {
    if (!isActive) return;
    
    // Slight delay to ensure closing animation finished before we unlock or we only lock on fully active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isActive]);

  // Ensure sheet always reopens from a sane position.
  useEffect(() => {
    if (!isActive) {
      gestureStateRef.current = { startY: null, currentY: 0 };
      const timeoutId = window.setTimeout(() => {
        setTranslateY(0);
        setIsDragging(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [isActive]);

  const scheduleTranslateY = useCallback((nextValue: number) => {
    translateYRef.current = nextValue;
    if (rafIdRef.current !== null) return;

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      setTranslateY(translateYRef.current);
    });
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track single touches
    if (e.touches.length !== 1) return;
    
    // Don't intercept touches if we are inside a scrolling container that itself is scrolled down
    // Since this is a simple hook, we'll let it slide, but we just track Y offset.
    gestureStateRef.current = {
      ...gestureStateRef.current,
      startY: e.touches[0].clientY
    };
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || gestureStateRef.current.startY === null) return;
    
    const dragY = e.touches[0].clientY - gestureStateRef.current.startY;
    
    // We only want to drag DOWNwards (val > 0). If dragY < 0 it means pulling up.
    if (dragY > 0) {
      // Small resistance for natural feel (optional)
      scheduleTranslateY(dragY);
      gestureStateRef.current = {
        ...gestureStateRef.current,
        currentY: dragY
      };
    } else {
      scheduleTranslateY(0);
      gestureStateRef.current = {
        ...gestureStateRef.current,
        currentY: 0
      };
    }
  }, [isDragging, scheduleTranslateY]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const shouldDismiss = gestureStateRef.current.currentY > threshold;

    // Always snap state back first to avoid "overlay visible but sheet offscreen" races.
    scheduleTranslateY(0);
    gestureStateRef.current = { startY: null, currentY: 0 };

    if (shouldDismiss) {
      onDismiss();
    }
  }, [isDragging, threshold, onDismiss, scheduleTranslateY]);

  const onTouchCancel = useCallback(() => {
    setIsDragging(false);
    scheduleTranslateY(0);
    gestureStateRef.current = { startY: null, currentY: 0 };
  }, [scheduleTranslateY]);

  // Extra safeguard: if translate remains > 0 while active and not dragging, snap it back.
  useEffect(() => {
    if (!isActive || isDragging || translateY <= 0) return;
    const t = window.setTimeout(() => scheduleTranslateY(0), 80);
    return () => window.clearTimeout(t);
  }, [isActive, isDragging, translateY, scheduleTranslateY]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    transform: `translateY(${translateY}px)`,
    isDragging,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel
    }
  };
}
