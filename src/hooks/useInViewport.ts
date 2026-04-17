import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInViewportOptions {
  rootMargin?: string;
  threshold?: number | number[];
  initialInView?: boolean;
  onChange?: (isInView: boolean) => void;
}

/**
 * Hook ottimizzato per rilevare quando un elemento è nel viewport
 *
 * Ottimizzazioni:
 * - Cleanup robusto con disconnessione observer
 * - Callback onChange per effetti collaterali esterni
 * - Gestione sicura SSR (IntersectionObserver undefined)
 * - Memoizzazione callback per evitare ricreazioni
 *
 * @param rootMargin - Margine attorno al viewport (default: '160px 0px')
 * @param threshold - Soglia di visibilità (default: 0.01)
 * @param initialInView - Stato iniziale (default: true)
 * @param onChange - Callback opzionale chiamata quando cambia lo stato
 */
export function useInViewport<T extends HTMLElement>({
  rootMargin = '160px 0px',
  threshold = 0.01,
  initialInView = true,
  onChange
}: UseInViewportOptions = {}) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(initialInView || typeof IntersectionObserver === 'undefined');
  const previousInViewRef = useRef<boolean>(initialInView);

  // Callback memoizzata per gestire il cambio di stato
  const handleInViewChange = useCallback((newIsInView: boolean) => {
    setIsInView(newIsInView);
    
    // Chiama onChange solo se lo stato è cambiato effettivamente
    if (previousInViewRef.current !== newIsInView && onChange) {
      onChange(newIsInView);
      previousInViewRef.current = newIsInView;
    }
  }, [onChange]);

  useEffect(() => {
    const node = ref.current;
    
    // SSR guard o browser senza IntersectionObserver
    if (!node || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const newIsInView = entry.isIntersecting || entry.intersectionRatio > 0;
        handleInViewChange(newIsInView);
      },
      { 
        rootMargin, 
        threshold: Array.isArray(threshold) ? threshold : [threshold],
        root: null
      }
    );

    observer.observe(node);

    // Cleanup robusto: disconnette tutte le osservazioni
    return () => {
      observer.disconnect();
      observer.takeRecords(); // Svuota il queue per evitare callback pending
    };
  }, [rootMargin, threshold, handleInViewChange]);

  return { ref, isInView };
}
