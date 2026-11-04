import { desktopBridge } from "../../platform/desktop.js";

interface KeyView {
  readonly createdAt: number;
  readonly keyId: string;
  readonly lastUsedAt: number | null;
  readonly name: string;
  readonly perms: readonly string[];
  readonly revoked: boolean;
}

interface CreatedKey {
  readonly key: string;
  readonly keyId: string;
}

interface KeyInput {
  readonly name: string;
  readonly orgId: string;
  readonly perms: readonly string[];
}

interface DesktopKeys {
  readonly create: (input: KeyInput) => Promise<CreatedKey>;
  readonly list: (orgId: string) => Promise<readonly KeyView[]>;
  readonly revoke: (orgId: string, keyId: string) => Promise<void>;
}

interface DesktopHost {
  readonly keys?: DesktopKeys;
}

const READ_PERMS = ["project.read", "comment.read", "studio.read"] as const;

const WRITE_PERMS = [
  ...READ_PERMS,
  "comment.write",
  "project.update",
  "studio.write",
] as const;

const readDesktopKeys = (): DesktopKeys | null =>
  desktopBridge<DesktopHost>()?.keys ?? null;

const toPerms = (canWrite: boolean): readonly string[] => {
  if (canWrite) {
    return WRITE_PERMS;
  }

  return READ_PERMS;
};

const toActive = (keys: readonly KeyView[]): readonly KeyView[] =>
  keys.filter((key) => !key.revoked);

export { readDesktopKeys, toActive, toPerms };

export type { CreatedKey, DesktopKeys, KeyInput, KeyView };
