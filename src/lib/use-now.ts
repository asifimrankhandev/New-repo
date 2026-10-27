import { useEffect, useState } from 'react';

/**
 * Current time as render-safe state, refreshed every minute. Components read `now` instead of
 * calling `Date.now()` during render, which keeps renders pure for the React Compiler.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function endOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}
