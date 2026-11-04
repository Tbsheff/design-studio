type GuardResult =
  | { readonly code: string; readonly ok: false }
  | { readonly ok: true };

interface UploadFacts {
  readonly appRoot: string | null;
  readonly isKnownHash: boolean;
  readonly resolved: string | null;
  readonly sourceRoot: string | null;
}

const SEPARATORS = ["/", "\\"] as const;

const isInsideRoot = (child: string, root: string | null): boolean =>
  root !== null &&
  (child === root ||
    SEPARATORS.some((separator) => child.startsWith(root + separator)));

const inspectSourceUpload = (facts: UploadFacts): GuardResult => {
  if (facts.resolved === null) {
    return { code: "path_unresolved", ok: false };
  }

  if (isInsideRoot(facts.resolved, facts.appRoot)) {
    return { code: "inside_app_dir", ok: false };
  }

  if (isInsideRoot(facts.resolved, facts.sourceRoot)) {
    return { code: "inside_source_path", ok: false };
  }

  if (facts.isKnownHash) {
    return { code: "matches_app_dir_hash", ok: false };
  }

  return { ok: true };
};

export { inspectSourceUpload, isInsideRoot };

export type { GuardResult, UploadFacts };
