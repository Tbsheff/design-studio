// @generated
import type { VersionsActions } from "../../../shared/actions/versions/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as getVersionsHandle } from "./get.js";
import { handle as inspectDiffVersionsHandle } from "./inspect-diff.js";
import { handle as listHistoryVersionsHandle } from "./list-history.js";
import { handle as listHunksVersionsHandle } from "./list-hunks.js";
import { handle as listVersionsHandle } from "./list.js";

const VersionsEntries = {
  getVersions: { handle: getVersionsHandle },
  inspectDiffVersions: { handle: inspectDiffVersionsHandle },
  listVersions: { handle: listVersionsHandle },
  listHistoryVersions: { handle: listHistoryVersionsHandle },
  listHunksVersions: { handle: listHunksVersionsHandle },
} satisfies Entries<typeof VersionsActions>;

export { VersionsEntries };
