type BlobKind = "attachment" | "blob";

interface BlobRef {
  readonly kind: BlobKind;
  readonly name: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;

const HASH_PATTERN = /^[0-9a-f]{64}$/u;

const FOLDERS: Readonly<Record<BlobKind, string>> = {
  attachment: "attachments",
  blob: "blobs",
};

const PATTERNS: Readonly<Record<BlobKind, RegExp>> = {
  attachment: ID_PATTERN,
  blob: HASH_PATTERN,
};

const toBlobPrefix = (orgId: string, kind: BlobKind): string =>
  `org/${orgId}/${FOLDERS[kind]}/`;

const toBlobKey = (orgId: string, ref: BlobRef): string | null => {
  if (!PATTERNS[ref.kind].test(ref.name)) {
    return null;
  }

  return `${toBlobPrefix(orgId, ref.kind)}${ref.name}`;
};

export { toBlobKey, toBlobPrefix };

export type { BlobKind, BlobRef };
