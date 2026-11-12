interface StudioSession {
  readonly previewOrigin: string;
  readonly token: string;
}

const TOKEN_BYTES = 16;

const HEX_RADIX = 16;

const FORBIDDEN_STATUS = 403;

const NO_ACCESS_TEXT =
  "This page cannot open the studio session. Open Design Studio from the desktop app. In dev, open the link that the server wrote to its log at start.";

let current: StudioSession | null = null;

const readMeta = (name: string): string | null => {
  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const value = meta?.content?.trim();

  return value || null;
};

const fetchSession = async (): Promise<StudioSession> => {
  const response = await fetch("/api/session");

  if (response.status === FORBIDDEN_STATUS) {
    throw new Error(NO_ACCESS_TEXT);
  }

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

const RENEW_GAP_MS = 5000;

let renewing: Promise<boolean> | null = null;

let lastRenewAt = 0;

const doRenew = async (): Promise<boolean> => {
  lastRenewAt = Date.now();

  try {
    const next = await fetchSession();
    const isChanged = next.token !== current?.token;
    current = next;

    return isChanged;
  } catch {
    return false;
  }
};

const runRenew = async (): Promise<boolean> => {
  const isChanged = await doRenew();
  renewing = null;

  return isChanged;
};

const renewSession = (): Promise<boolean> => {
  if (renewing !== null) {
    return renewing;
  }

  if (Date.now() - lastRenewAt < RENEW_GAP_MS) {
    return Promise.resolve(false);
  }

  renewing = runRenew();

  return renewing;
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

export { getSession, loadSession, randomToken, renewSession };

export type { StudioSession };
