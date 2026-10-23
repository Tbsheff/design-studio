interface StudioSession {
  token: string;
  previewOrigin: string;
}

let current: StudioSession | null = null;

function readMeta(name: string): string | null {
  const el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const value = el?.content?.trim();
  return value ? value : null;
}

export async function loadSession(): Promise<StudioSession> {
  if (current) return current;
  const token = readMeta('studio-token');
  const previewOrigin = readMeta('studio-preview-origin');
  if (token && previewOrigin) {
    current = { token, previewOrigin };
    return current;
  }
  const res = await fetch('/api/session');
  if (!res.ok) throw new Error(`Session request failed: ${res.status}`);
  const body = (await res.json()) as Partial<StudioSession>;
  if (!body.token || !body.previewOrigin) throw new Error('Session response is missing token or previewOrigin');
  current = { token: body.token, previewOrigin: body.previewOrigin };
  return current;
}

export function getSession(): StudioSession {
  if (!current) throw new Error('Session not loaded');
  return current;
}

export function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
