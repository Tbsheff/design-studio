export const LAYER_REF = /^e[0-9a-z]{6}$/;

const SPACE = 36 ** 6;

export function layerRef(key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `e${((hash >>> 0) % SPACE).toString(36).padStart(6, '0')}`;
}

export function layerKey(own: string, used: string | null, nth: number): string {
  return `${own}|${used ?? ''}#${nth}`;
}
