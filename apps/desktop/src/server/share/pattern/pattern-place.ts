import {
  BadRequestError,
  assertCanEdit,
  publishVersion,
  writeAndCommitAll,
} from "./deps.js";
import type {
  Direction,
  DirectEditDeps,
  InsertScope,
  Project,
  SourceLoc,
  VersionMeta,
} from "./deps.js";
import { insertHtmlLayer, insertReactLayer } from "./pattern-layer.js";
import type {
  InsertPosition,
  PatternInserted,
  StoredPattern,
} from "./pattern-model.js";
import { insertHtmlPage, insertReactPage } from "./pattern-page.js";
import type { PatternPlan } from "./pattern-plan.js";
import { toPrepared } from "./pattern-prepare.js";
import type { Prepared } from "./pattern-prepare.js";

interface PlaceScope {
  readonly deps: DirectEditDeps;
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

interface PlaceCommand {
  readonly page: string | null;
  readonly position: InsertPosition;
  readonly source: SourceLoc | null;
  readonly tag: string | null;
}

const toPlan = (
  scope: InsertScope,
  stored: StoredPattern,
  prepared: Prepared,
  command: PlaceCommand
): Promise<PatternPlan> => {
  const isReact = scope.project.kind === "react";

  if (command.page !== null) {
    if (isReact) {
      return insertReactPage(scope, stored, prepared, command.page);
    }

    return insertHtmlPage(scope, stored, prepared, command.page);
  }

  const layer = {
    position: command.position,
    source: command.source as SourceLoc,
    tag: command.tag,
  };

  if (isReact) {
    return insertReactLayer(scope, stored, prepared, layer);
  }

  return insertHtmlLayer(scope, stored, prepared, layer);
};

const toNote = (inserted: Omit<PatternInserted, "note">): string | null => {
  const parts = [
    ...inserted.unmappedImports.map((item) => item.name),
    ...inserted.unmappedTokens.map((item) => item.name),
  ];

  if (parts.length === 0 && inserted.dropped.length === 0) {
    return null;
  }

  return `${inserted.unmappedImports.length} imports and ${inserted.unmappedTokens.length} tokens did not map, and ${inserted.dropped.length} items were dropped. Read unmappedImports, unmappedTokens and dropped.`;
};

const insertStoredPattern = async (
  scope: PlaceScope,
  stored: StoredPattern,
  command: PlaceCommand
): Promise<PatternInserted> => {
  if ((command.page === null) === (command.source === null)) {
    throw new BadRequestError(
      "Give target (a layer to insert at) or page (a new page route), not both and not neither."
    );
  }

  const { deps, direction, project, workTree } = scope;
  assertCanEdit(deps, project, direction);
  const place: InsertScope = { previewOrigin: null, project, workTree };
  const prepared = await toPrepared(place, stored);
  const plan = await toPlan(place, stored, prepared, command);
  const meta: VersionMeta = { kind: "manual", prompt: plan.title };

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    [
      {
        code: plan.code,
        created: plan.isNew,
        original: plan.original,
        target: plan.target,
      },
    ],
    plan.title,
    meta
  );

  deps.history?.record({
    directionId: direction.id,
    files: [
      {
        after: plan.code,
        before: plan.original,
        created: plan.isNew,
        file: plan.target.file,
        relative: plan.target.relative,
      },
    ],
    label: version.title,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(deps, project, direction, version);

  const base = {
    addedImports: plan.addedImports,
    dropped: prepared.dropped,
    file: plan.target.relative,
    isNewPage: plan.isNew,
    mappedTokens: prepared.mappedTokens,
    patternId: stored.id,
    route: plan.route,
    title: plan.title,
    unmappedImports: prepared.mapping.unmapped,
    unmappedTokens: prepared.unmappedTokens,
    unresolvedNames: plan.unresolved,
    versionId: version.id,
  };

  return { ...base, note: toNote(base) };
};

export { insertStoredPattern };

export type { PlaceCommand, PlaceScope };
