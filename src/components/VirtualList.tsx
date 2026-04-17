import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  overscan?: number;
  className?: string;
  keyExtractor: (item: T, index: number) => string;
  onScroll?: (scrollTop: number) => void;
}

/**
 * Componente per virtualizzazione liste lunghe
 * Renderizza solo gli elementi visibili + overscan
 *
 * Ottimizzazioni:
 * - requestAnimationFrame per scroll fluido (60fps)
 * - Throttle naturale tramite RAF
 * - Memoizzazione aggressiva dei calcoli
 *
 * @param items - Dati da renderizzare
 * @param itemHeight - Altezza fissa di ogni elemento (px)
 * @param renderItem - Funzione di render per ogni item
 * @param containerHeight - Altezza del contenitore (default: 400px)
 * @param overscan - Numero di elementi extra da renderizzare sopra/sotto il viewport
 * @param className - Classe CSS opzionale
 * @param keyExtractor - Estrattore chiave per React key
 * @param onScroll - Callback opzionale per tracking scroll position
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight = 400,
  overscan = 5,
  className = '',
  keyExtractor,
  onScroll
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const totalHeight = items.length * itemHeight;
  const rafRef = useRef<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calcola range di items da renderizzare - memoizzato per evitare ricalcoli
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items.slice(start, end)
    };
  }, [scrollTop, items, containerHeight, itemHeight, overscan]);

  // Padding superiore/inferiore per mantenere lo scroll corretto
  const paddingTop = startIndex * itemHeight;
  const paddingBottom = (items.length - endIndex) * itemHeight;

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Handle scroll con requestAnimationFrame per performance ottimali
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;

    // Callback opzionale per tracking esterno
    if (onScroll) {
      onScroll(newScrollTop);
    }

    // Usa RAF per batchtare gli update e evitare re-render multipli
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
      rafRef.current = null;
    });
  }, [onScroll]);

  if (items.length === 0) {
    return (
      <div className={className} style={{ minHeight: containerHeight }}>
        Nessuno elemento
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflowY: 'auto',
        position: 'relative',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop,
            paddingBottom
          }}
        >
          {visibleItems.map((item, index) => (
            <React.Fragment key={keyExtractor(item, startIndex + index)}>
              {renderItem(item, startIndex + index)}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
