import { useState, useRef, useCallback, useEffect } from 'react';

interface SwipeToDismissResult {
  transform: string;
  isDragging: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

export function useSwipeToDismiss(
  onDismiss: () => void,
  threshold: number = 100, // pixels downwards to dismiss
  isActive: boolean = true // whether the sheet is currently fully active/open
): SwipeToDismissResult {
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
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
  
  const startY = useRef<number | null>(null);
  const currentY = useRef<number>(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track single touches
    if (e.touches.length !== 1) return;
    
    // Don't intercept touches if we are inside a scrolling container that itself is scrolled down
    // Since this is a simple hook, we'll let it slide, but we just track Y offset.
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || startY.current === null) return;
    
    const dragY = e.touches[0].clientY - startY.current;
    
    // We only want to drag DOWNwards (val > 0). If dragY < 0 it means pulling up.
    if (dragY > 0) {
      // Small resistance for natural feel (optional)
      setTranslateY(dragY);
      currentY.current = dragY;
    } else {
      setTranslateY(0);
      currentY.current = 0;
    }
  }, [isDragging]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (currentY.current > threshold) {
      // Dismiss
      onDismiss();
      // Keep it down while closing
      setTranslateY(window.innerHeight);
    } else {
      // Snap back
      setTranslateY(0);
    }
    
    startY.current = null;
    currentY.current = 0;
  }, [isDragging, threshold, onDismiss]);

  return {
    transform: `translateY(${translateY}px)`,
    isDragging,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  };
}
