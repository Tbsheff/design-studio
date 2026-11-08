const EVENT = "studio:open-app";

let pending: { path: string } | null = null;

export function requestOpenApp(path = ""): void {
  pending = { path };
  globalThis.dispatchEvent(new CustomEvent(EVENT));
}

export function takeOpenAppRequest(): { path: string } | null {
  const next = pending;
  pending = null;

  return next;
}

export function onOpenAppRequest(handler: () => void): () => void {
  globalThis.addEventListener(EVENT, handler);

  return () => globalThis.removeEventListener(EVENT, handler);
}
