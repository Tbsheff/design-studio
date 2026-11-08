const EVENT = "studio:open-app";

let pending: { path: string } | null = null;

function requestOpenApp(path = ""): void {
  pending = { path };
  globalThis.dispatchEvent(new CustomEvent(EVENT));
}

function takeOpenAppRequest(): { path: string } | null {
  const next = pending;
  pending = null;

  return next;
}

function onOpenAppRequest(handler: () => void): () => void {
  globalThis.addEventListener(EVENT, handler);

  return () => globalThis.removeEventListener(EVENT, handler);
}

export { requestOpenApp, takeOpenAppRequest, onOpenAppRequest };
