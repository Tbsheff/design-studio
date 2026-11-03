// @generated
import { getVersions } from "./get.js";
import { inspectDiffVersions } from "./inspect-diff.js";
import { listHistoryVersions } from "./list-history.js";
import { listHunksVersions } from "./list-hunks.js";
import { listVersions } from "./list.js";

const VersionsActions = {
  getVersions,
  inspectDiffVersions,
  listVersions,
  listHistoryVersions,
  listHunksVersions,
} as const;

export { VersionsActions };
