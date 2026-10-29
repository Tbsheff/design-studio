export const LAYER_LOCK_KEYS_MAX = 500;
export const LAYER_LOCK_KEY_MAX = 2000;

export interface LayerLocksView {
  directionId: string;
  keys: string[];
}

export function cleanLockKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const keys = raw.filter((key): key is string => typeof key === 'string' && key.length > 0 && key.length <= LAYER_LOCK_KEY_MAX);
  return [...new Set(keys)].slice(0, LAYER_LOCK_KEYS_MAX);
}
