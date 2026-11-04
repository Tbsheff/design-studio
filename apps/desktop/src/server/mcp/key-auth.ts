import type { Permission } from "@design-studio/actions/_core/permissions";

import { toKeyPrincipal } from "../store/principal.js";
import type { KeyPrincipal } from "../store/principal.js";

interface KeyRecord {
  readonly actingUserId: string | null;
  readonly name: string;
  readonly perms: readonly Permission[];
  readonly revoked: boolean;
}

type IntrospectResult =
  | { readonly kind: "offline" }
  | { readonly kind: "ok"; readonly record: KeyRecord }
  | { readonly kind: "unknown" };

type Introspect = (orgId: string, keyId: string) => Promise<IntrospectResult>;

interface KeyToken {
  readonly keyId: string;
  readonly orgId: string;
}

interface Resolved {
  readonly client: string;
  readonly offlineSince: number | null;
  readonly principal: KeyPrincipal;
}

type Resolution =
  | { readonly kind: "denied" }
  | { readonly kind: "key"; readonly resolved: Resolved }
  | { readonly kind: "offline" };

interface CacheEntry {
  readonly checkedAt: number;
  readonly okAt: number;
  readonly record: KeyRecord;
}

const POSITIVE_TTL_MS = 60_000;
const OFFLINE_EDIT_LIMIT_MS = 3_600_000;
const MAX_CACHE = 500;
const TOKEN_PATTERN = /^ds_(?<orgId>[\w-]+)\.(?<keyId>[\w-]+)\.[\w-]+$/u;
const PUBLISH_TOOLS = new Set([
  "publish_design",
  "rollback_publication",
  "unpublish_design",
]);

const parseKeyToken = (bearer: string): KeyToken | null => {
  const match = TOKEN_PATTERN.exec(bearer);

  if (match === null) {
    return null;
  }

  const { keyId, orgId } = match.groups as { keyId: string; orgId: string };

  return { keyId, orgId };
};

const toPrincipal = (token: KeyToken, record: KeyRecord): KeyPrincipal =>
  toKeyPrincipal({
    actingUserId: record.actingUserId,
    keyId: token.keyId,
    orgId: token.orgId,
    perms: record.perms,
  });

const toOfflineSince = (entry: CacheEntry): number | null => {
  if (entry.okAt === entry.checkedAt) {
    return null;
  }

  return entry.okAt;
};

const toResolved = (token: KeyToken, entry: CacheEntry): Resolved => ({
  client: entry.record.name,
  offlineSince: toOfflineSince(entry),
  principal: toPrincipal(token, entry.record),
});

interface KeyResolver {
  readonly resolve: (bearer: string) => Promise<Resolution>;
}

interface KeyStore {
  readonly cache: Map<string, CacheEntry>;
  readonly now: () => number;
  readonly revoked: Set<string>;
}

const remember = (store: KeyStore, bearer: string, entry: CacheEntry): void => {
  store.cache.set(bearer, entry);

  if (store.cache.size > MAX_CACHE) {
    store.cache.delete(store.cache.keys().next().value as string);
  }
};

const forget = (store: KeyStore, bearer: string): Resolution => {
  store.revoked.add(bearer);
  store.cache.delete(bearer);

  return { kind: "denied" };
};

const fromOffline = (
  store: KeyStore,
  bearer: string,
  token: KeyToken,
  cached: CacheEntry | null
): Resolution => {
  if (cached === null) {
    return { kind: "offline" };
  }

  remember(store, bearer, { ...cached, checkedAt: store.now() });

  return {
    kind: "key",
    resolved: {
      client: cached.record.name,
      offlineSince: cached.okAt,
      principal: toPrincipal(token, cached.record),
    },
  };
};

const fromOk = (
  store: KeyStore,
  bearer: string,
  token: KeyToken,
  record: KeyRecord
): Resolution => {
  if (record.revoked) {
    return forget(store, bearer);
  }

  const stamp = store.now();
  const entry = { checkedAt: stamp, okAt: stamp, record };
  remember(store, bearer, entry);

  return { kind: "key", resolved: toResolved(token, entry) };
};

const isFresh = (store: KeyStore, cached: CacheEntry | null): boolean =>
  cached !== null &&
  cached.okAt === cached.checkedAt &&
  store.now() - cached.checkedAt < POSITIVE_TTL_MS;

const createKeyResolver = (
  introspect: Introspect,
  now: () => number = Date.now
): KeyResolver => {
  const store: KeyStore = {
    cache: new Map(),
    now: () => now(),
    revoked: new Set(),
  };

  const resolve = async (bearer: string): Promise<Resolution> => {
    const token = parseKeyToken(bearer);

    if (token === null || store.revoked.has(bearer)) {
      return { kind: "denied" };
    }

    const cached = store.cache.get(bearer) ?? null;

    if (cached !== null && isFresh(store, cached)) {
      return { kind: "key", resolved: toResolved(token, cached) };
    }

    const result = await introspect(token.orgId, token.keyId);

    if (result.kind === "unknown") {
      return forget(store, bearer);
    }

    if (result.kind === "offline") {
      return fromOffline(store, bearer, token, cached);
    }

    return fromOk(store, bearer, token, result.record);
  };

  return { resolve };
};

const offlineRefusal = (
  tool: string,
  isRead: boolean,
  offlineSince: number | null,
  now: number
): string | null => {
  if (offlineSince === null) {
    return null;
  }

  if (PUBLISH_TOOLS.has(tool)) {
    return "Offline: publish needs the cloud. Connect to the internet and try again.";
  }

  if (!isRead && now - offlineSince > OFFLINE_EDIT_LIMIT_MS) {
    return "Offline: Design Studio could not check this key for over 1 hour, so edits stop. Reads still work. Connect to the internet to continue.";
  }

  return null;
};

export { createKeyResolver, offlineRefusal, parseKeyToken };

export type { Introspect, IntrospectResult, KeyRecord, Resolution, Resolved };
