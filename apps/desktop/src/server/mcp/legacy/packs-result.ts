import type { Version } from "@design-studio/contracts";

interface ApplyResult {
  version: Version | null;
  notice: string | null;
}

interface AppliedResult {
  applied: string;
  changedFiles: Version["changedFiles"];
  notice: string | null;
  versionId: string | null;
}

const appliedResult = (packId: string, result: ApplyResult): AppliedResult => ({
  applied: packId,
  versionId: result.version?.id ?? null,
  changedFiles: result.version?.changedFiles ?? [],
  notice: result.notice,
});

export { appliedResult };

export type { ApplyResult };
