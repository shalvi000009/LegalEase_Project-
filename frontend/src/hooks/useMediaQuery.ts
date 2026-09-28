import { useState, useEffect } from 'react';

/**
 * Custom hook to trigger responsive layout logic based on media query strings.
 * @param query CSS media query string, e.g. '(max-width: 768px)'
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const updateMatches = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    setMatches(mediaQueryList.matches);

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updateMatches);
      return () => mediaQueryList.removeEventListener('change', updateMatches);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(updateMatches);
      return () => mediaQueryList.removeListener(updateMatches);
    }
  }, [query]);

  return matches;
}
