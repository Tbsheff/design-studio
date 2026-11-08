import type { DevStatusEntrySchema } from "@design-studio/actions/dev-status/schema";
import type { Project } from "@design-studio/contracts";
import { Effect } from "effect";

import type { DevStatusRecord } from "./dev-status-file.js";
import { listCurrentHashes } from "./dev-status-frame.js";
import { toChangedFiles } from "./engine/to-changed-files.js";

type DevStatusEntry = typeof DevStatusEntrySchema.Type;

const toEntry = (
  record: DevStatusRecord,
  changedFiles: readonly string[]
): DevStatusEntry => ({
  changedFiles,
  frameId: record.frameId,
  isChangedSince: changedFiles.length > 0,
  markedAt: record.markedAt,
  markedVersionId: record.markedVersionId,
  note: record.note,
  page: record.page,
  route: record.route,
  status: record.status,
});

const getEntry = Effect.fn("DevStatusEntry.get")(function* run(
  project: Project,
  record: DevStatusRecord
) {
  const direction =
    project.directions.find((item) => item.id === record.directionId) ?? null;

  const current = yield* listCurrentHashes(direction, record.files);

  return toEntry(record, toChangedFiles(record.files, current));
});

export { getEntry, toEntry };

export type { DevStatusEntry };
