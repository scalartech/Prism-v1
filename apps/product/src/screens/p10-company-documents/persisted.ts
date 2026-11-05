/**
 * A small localStorage-backed store for prototype data that several screens
 * read at once (the Final Report tab and its warning dot, the Exports tab and
 * the Excel Export dialog). One in-memory copy per key, so every reader sees a
 * write straight away; storage blocked → the data lives for the session only.
 */
import { useCallback, useSyncExternalStore } from 'react';

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

export function readPersisted<T>(key: string, seed: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value: T | undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = JSON.parse(raw) as T;
  } catch { /* storage blocked or bad JSON: start from the seed */ }
  const v = value ?? seed();
  cache.set(key, v);
  return v;
}

export function writePersisted<T>(key: string, value: T) {
  cache.set(key, value);
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* session only */ }
  listeners.get(key)?.forEach((l) => l());
}

export function clearPersisted(key: string) {
  cache.delete(key);
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  listeners.get(key)?.forEach((l) => l());
}

export function usePersisted<T>(key: string, seed: () => T): [T, (next: T | ((cur: T) => T)) => void] {
  const subscribe = useCallback((on: () => void) => {
    const set = listeners.get(key) ?? new Set();
    set.add(on);
    listeners.set(key, set);
    return () => { set.delete(on); };
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => readPersisted(key, seed));
  const set = useCallback((next: T | ((cur: T) => T)) => {
    const cur = readPersisted(key, seed);
    writePersisted(key, typeof next === 'function' ? (next as (c: T) => T)(cur) : next);
  }, [key, seed]);
  return [value, set];
}
