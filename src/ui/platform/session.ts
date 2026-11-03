interface StudioSession {
  readonly previewOrigin: string;
  readonly token: string;
}

const TOKEN_BYTES = 16;

const HEX_RADIX = 16;

let current: StudioSession | null = null;

const readMeta = (name: string): string | null => {
  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const value = meta?.content?.trim();

  return value || null;
};

const fetchSession = async (): Promise<StudioSession> => {
  const response = await fetch("/api/session");

  if (!response.ok) {
    throw new Error(`Session request failed: ${response.status}`);
  }

  const body = (await response.json()) as Partial<StudioSession>;

  if (!body.token || !body.previewOrigin) {
    throw new Error("Session response is missing token or previewOrigin");
  }

  return { previewOrigin: body.previewOrigin, token: body.token };
};

const loadSession = async (): Promise<StudioSession> => {
  if (current) {
    return current;
  }

  const token = readMeta("studio-token");
  const previewOrigin = readMeta("studio-preview-origin");

  if (token && previewOrigin) {
    current = { previewOrigin, token };

    return current;
  }

  current = await fetchSession();

  return current;
};

const getSession = (): StudioSession => {
  if (!current) {
    throw new Error("Session not loaded");
  }

  return current;
};

const randomToken = (): string => {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) =>
    byte.toString(HEX_RADIX).padStart(2, "0")
  ).join("");
};

export { getSession, loadSession, randomToken };

export type { StudioSession };
