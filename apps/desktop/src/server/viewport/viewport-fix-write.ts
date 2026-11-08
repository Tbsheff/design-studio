import { Effect } from "effect";

import {
  assertCanEdit,
  publishVersion,
  savedVersionId,
  savesSettled,
  runDirectionRead,
  runDirectionWrite,
  toDirectEditStatusFailure,
  writeAndCommitAll,
} from "../direct-edit/index.js";
import type { DirectionIds, WrittenFile } from "../direct-edit/index.js";
import { attemptKnown } from "./deps.js";

const toTitle = (count: number): string =>
  `Fix viewport findings: ${count} edits`;

const toPrompt = (title: string, files: readonly WrittenFile[]): string =>
  `${title} in ${files.map((entry) => entry.target.relative).join(", ")}`;

const applyFixFiles = Effect.fn("applyFixFiles")(function* run(
  ids: DirectionIds,
  files: readonly WrittenFile[],
  count: number
) {
  const title = toTitle(count);

  const version = yield* runDirectionWrite(
    ids,
    ({ direction, project, runtime }) => {
      assertCanEdit(runtime.editDeps, project, direction);

      return writeAndCommitAll(
        runtime.editDeps,
        project,
        direction,
        [...files],
        title,
        { kind: "manual", prompt: toPrompt(title, files) }
      );
    },
    toDirectEditStatusFailure
  );

  yield* runDirectionRead(
    ids,
    ({ direction, project, runtime }) => {
      runtime.editDeps.history?.record({
        directionId: direction.id,
        files: files.map((entry) => ({
          after: entry.code,
          before: entry.original,
          file: entry.target.file,
          relative: entry.target.relative,
        })),
        label: version.title,
        projectId: project.id,
        versionId: version.id,
      });

      return publishVersion(runtime.editDeps, project, direction, version);
    },
    toDirectEditStatusFailure
  );

  yield* attemptKnown(() => savesSettled(ids.projectId));

  return savedVersionId(version.id);
});

export { applyFixFiles };
