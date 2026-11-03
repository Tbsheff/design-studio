type ProjectKind = "native" | "attached" | "imported";

type SyncPolicy = "full" | "metadata-only";

type UploadKind =
  | "project"
  | "direction"
  | "version"
  | "version_file"
  | "blob_ref"
  | "version_name"
  | "comment"
  | "comment_reply"
  | "layer_lock"
  | "canvas"
  | "run_summary"
  | "run_jsonl"
  | "frame"
  | "thumbnail"
  | "screenshot";

interface PolicyInput {
  readonly kind: ProjectKind;
  readonly framesEnabled: boolean;
}

const METADATA_KINDS: readonly UploadKind[] = [
  "project",
  "direction",
  "comment",
  "comment_reply",
  "layer_lock",
  "canvas",
  "run_summary",
];

const FULL_ONLY_KINDS: readonly UploadKind[] = [
  "version",
  "version_file",
  "blob_ref",
  "version_name",
  "run_jsonl",
];

const FRAME_KINDS: readonly UploadKind[] = ["frame", "thumbnail", "screenshot"];

const NEVER_SYNC: readonly string[] = [
  "command_rule",
  "allowBash",
  "allowInstall",
];

const pickSyncPolicy = (input: PolicyInput): SyncPolicy => {
  if (input.kind === "native") {
    return "full";
  }

  return "metadata-only";
};

const allowedUploadKinds = (
  policy: SyncPolicy,
  framesEnabled = false
): readonly UploadKind[] => {
  if (policy === "full") {
    return [...METADATA_KINDS, ...FULL_ONLY_KINDS, ...FRAME_KINDS];
  }

  if (framesEnabled) {
    return [...METADATA_KINDS, ...FRAME_KINDS];
  }

  return METADATA_KINDS;
};

const canUpload = (input: PolicyInput, uploadKind: UploadKind): boolean =>
  allowedUploadKinds(pickSyncPolicy(input), input.framesEnabled).includes(
    uploadKind
  );

const isNeverSynced = (name: string): boolean => NEVER_SYNC.includes(name);

export {
  allowedUploadKinds,
  canUpload,
  isNeverSynced,
  NEVER_SYNC,
  pickSyncPolicy,
};

export type { PolicyInput, ProjectKind, SyncPolicy, UploadKind };
