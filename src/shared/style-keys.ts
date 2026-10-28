export function kebabKeys(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key.startsWith('--') ? key : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), entry]));
}
