import { useEffect, useState } from 'react';

export const EXIT_MS = 100;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePresence<T>(value: T | null): { shown: T | null; closing: boolean } {
  const [kept, setKept] = useState<T | null>(value);
  useEffect(() => {
    if (value !== null) {
      setKept(value);
      return;
    }
    if (reducedMotion()) {
      setKept(null);
      return;
    }
    const timer = window.setTimeout(() => setKept(null), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [value]);
  return { shown: value ?? kept, closing: value === null && kept !== null };
}
