import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LazyImage.styles';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholderColor?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente immagine con lazy loading e placeholder
 *
 * Ottimizzazioni:
 * - IntersectionObserver per caricamento on-demand
 * - Placeholder colorato durante il loading
 * - Blur-up effect opzionale
 * - Gestione errore con fallback
 *
 * @param src - URL dell'immagine
 * @param alt - Testo alternativo
 * @param className - Classe CSS opzionale
 * @param width - Larghezza immagine
 * @param height - Altezza immagine
 * @param placeholderColor - Colore placeholder durante loading
 * @param threshold - Soglia IntersectionObserver (0-1)
 * @param onLoad - Callback quando immagine è caricata
 * @param onError - Callback quando caricamento fallisce
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholderColor = '#e2e8f0',
  threshold = 0.1,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback memoizzata per gestire il caricamento immagine
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Callback memoizzata per gestire errori
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  useEffect(() => {
    // IntersectionObserver per lazy loading
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold]);

  // Effetto separato per controllo cache (evita setState nell'effect principale)
  useEffect(() => {
    if (!src) return;
    
    const cachedImage = new Image();
    cachedImage.src = src;
    
    if (cachedImage.complete) {
      // Usa requestAnimationFrame per deferire l'update
      const rafId = requestAnimationFrame(() => {
        setIsLoaded(true);
        setIsInView(true);
      });
      
      return () => cancelAnimationFrame(rafId);
    }
  }, [src]);

  return (
    <div
      ref={imgRef}
      className={className}
      style={{
        position: 'relative',
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        backgroundColor: isLoaded || hasError ? 'transparent' : placeholderColor,
        overflow: 'hidden',
        borderRadius: 'inherit'
      }}
    >
      {/* Placeholder skeleton */}
      {!isLoaded && !hasError && isInView && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: placeholderColor,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      )}

      {/* Immagine reale */}
      {isInView && (
        <img
          src={hasError ? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23cbd5e1" width="100" height="100"/%3E%3Ctext fill="%2364748b" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="12"%3EImg%3C/text%3E%3C/svg%3E' : src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            display: isLoaded ? 'block' : 'none',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}

      {/* Fallback error */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            color: '#94a3b8',
            fontSize: '0.75rem'
          }}
        >
          Immagine non disponibile
        </div>
      )}
    </div>
  );
};
