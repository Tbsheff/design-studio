interface BoundedCache<Key, Value> {
  readonly clear: () => void;
  readonly delete: (key: Key) => boolean;
  readonly get: (key: Key) => Value | null;
  readonly set: (key: Key, value: Value) => void;
  readonly size: () => number;
}

const evictOldest = <Key, Value>(
  entries: Map<Key, Value>,
  maxEntries: number
): void => {
  while (entries.size > maxEntries) {
    const oldest = entries.keys().next();

    if (oldest.done) {
      return;
    }

    entries.delete(oldest.value);
  }
};

const createBoundedCache = <Key, Value>(
  maxEntries: number
): BoundedCache<Key, Value> => {
  const entries = new Map<Key, Value>();

  return {
    clear: () => {
      entries.clear();
    },
    delete: (key) => entries.delete(key),
    get: (key) => {
      if (!entries.has(key)) {
        return null;
      }

      const value = entries.get(key) as Value;

      entries.delete(key);
      entries.set(key, value);

      return value;
    },
    set: (key, value) => {
      entries.delete(key);
      entries.set(key, value);
      evictOldest(entries, maxEntries);
    },
    size: () => entries.size,
  };
};

export { createBoundedCache };

export type { BoundedCache };
