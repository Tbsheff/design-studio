import type { PageSourceChange } from "@design-studio/actions/page/source/schema";

const CHANGES_MAX = 50;

interface RouteFileHash {
  readonly file: string;
  readonly sha: string;
}

const toChange = (
  saved: RouteFileHash,
  now: ReadonlyMap<string, string | null>
): PageSourceChange[] => {
  const sha = now.get(saved.file) ?? null;

  if (sha === null) {
    return [{ change: "deleted", file: saved.file }];
  }

  if (sha !== saved.sha) {
    return [{ change: "changed", file: saved.file }];
  }

  return [];
};

const toChangedFiles = (
  saved: readonly RouteFileHash[],
  now: ReadonlyMap<string, string | null>
): PageSourceChange[] =>
  saved.flatMap((entry) => toChange(entry, now)).slice(0, CHANGES_MAX);

export { toChangedFiles };

export type { RouteFileHash };
