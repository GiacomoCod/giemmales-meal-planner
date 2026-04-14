import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if a media query matches.
 * Defaults to max-width: 768px for mobile detection.
 */
export const useMediaQuery = (query: string = '(max-width: 768px)') => {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};
