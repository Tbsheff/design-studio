const EVENT = 'studio:open-app';

let pending: { path: string } | null = null;

export function requestOpenApp(path = ''): void {
  pending = { path };
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function takeOpenAppRequest(): { path: string } | null {
  const next = pending;
  pending = null;
  return next;
}

export function onOpenAppRequest(handler: () => void): () => void {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
