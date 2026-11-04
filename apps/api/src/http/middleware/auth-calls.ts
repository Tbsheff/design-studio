import type { AuthInstance } from "../../auth/gateway.js";

interface SessionUser {
  readonly email: string;
  readonly id: string;
}

interface SessionRecord {
  readonly createdAt: Date;
  readonly id: string;
}

interface SessionResult {
  readonly session: SessionRecord;
  readonly user: SessionUser;
}

interface DevicePayload {
  readonly aud?: string | readonly string[];
  readonly email?: string;
  readonly iat?: number;
  readonly sub?: string;
}

interface DeviceResult {
  readonly payload: DevicePayload | null;
}

interface KeyRecord {
  readonly enabled: boolean;
  readonly expiresAt: Date | null;
  readonly id: string;
  readonly name: string | null;
  readonly permissions: Readonly<Record<string, readonly string[]>> | null;
  readonly referenceId: string;
}

interface KeyResult {
  readonly key: KeyRecord | null;
  readonly valid: boolean;
}

interface AuthCalls {
  readonly getSession: (input: {
    readonly headers: Headers;
    readonly query: { readonly disableCookieCache: true };
  }) => Promise<SessionResult | null>;
  readonly verifyApiKey: (input: {
    readonly body: { readonly configId: string; readonly key: string };
  }) => Promise<KeyResult>;
  readonly verifyJWT: (input: {
    readonly body: { readonly token: string };
  }) => Promise<DeviceResult | null>;
}

const toAuthCalls = (api: AuthInstance["api"]): AuthCalls => ({
  getSession: async (input) => await api.getSession(input),
  verifyApiKey: async (input) => {
    const result = await api.verifyApiKey(input);
    const { key } = result;

    if (key === null) {
      return { key: null, valid: result.valid };
    }

    return {
      key: { ...key, permissions: key.permissions ?? null },
      valid: result.valid,
    };
  },
  verifyJWT: async (input) => await api.verifyJWT(input),
});

export { toAuthCalls };

export type { AuthCalls, DevicePayload, KeyRecord, SessionResult };
