import { useEffect, useRef, useState } from 'react';

interface UseInViewportOptions {
  rootMargin?: string;
  threshold?: number | number[];
  initialInView?: boolean;
}

export function useInViewport<T extends HTMLElement>({
  rootMargin = '160px 0px',
  threshold = 0.01,
  initialInView = true
}: UseInViewportOptions = {}) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(initialInView);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    let frameId: number | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextValue = entry.isIntersecting || entry.intersectionRatio > 0;

        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }

        frameId = window.requestAnimationFrame(() => {
          setIsInView(nextValue);
          frameId = null;
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(node);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  return { ref, isInView };
}
