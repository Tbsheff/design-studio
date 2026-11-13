import { readFile } from "node:fs/promises";

import type {
  PageMatchesUpdated,
  PageMatchTarget,
} from "@design-studio/actions/page/match/schema";

import {
  assertCanEdit,
  publishVersion,
  resolveSource,
  savesSettled,
  writeAndCommitAll,
} from "../../direct-edit/index.js";
import type { DirectionRun, WrittenFile } from "../../direct-edit/index.js";
import { BadRequestError, ConflictError } from "../../platform/errors/index.js";
import { toElementSpot } from "./engine/to-element-spot.js";
import { toMarkedMarkup } from "./engine/to-marked-markup.js";
import type { PageSource } from "./engine/to-page-matches.js";
import { toHtmlProject, toSource } from "./page-match-read.js";
import type { PageMatchCommand } from "./page-match-read.js";

const toChanged = (file: string): string =>
  `${file} changed since inspect_matches_page. Call inspect_matches_page again.`;

const toWrittenFile = async (
  run: DirectionRun,
  source: PageSource,
  target: PageMatchTarget,
  own: string
): Promise<WrittenFile | null> => {
  const resolved = await resolveSource(run.direction.workTree, target.file);

  if (resolved.relative === own) {
    throw new BadRequestError(
      `${own} is the source page. Leave it out of targets.`
    );
  }

  const original = await readFile(resolved.file, "utf-8");
  const spot = toElementSpot(original, target.selector);

  if (spot?.tag !== source.tag) {
    throw new ConflictError(toChanged(resolved.relative));
  }

  const marked = toMarkedMarkup(
    source.markup,
    original.slice(spot.start, spot.end)
  );

  const code =
    original.slice(0, spot.start) + marked + original.slice(spot.end);

  if (code === original) {
    return null;
  }

  return { code, original, target: resolved };
};

const toTitle = (source: PageSource, count: number): string => {
  if (count === 1) {
    return `Copy ${source.tag} to 1 page`;
  }

  return `Copy ${source.tag} to ${count} pages`;
};

const applyPageCopies = async (
  run: DirectionRun,
  source: PageSource,
  changed: WrittenFile[]
): Promise<PageMatchesUpdated> => {
  const { direction, project } = run;
  const deps = run.runtime.editDeps;
  const title = toTitle(source, changed.length);

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    changed,
    title,
    { kind: "manual", prompt: title }
  );

  deps.history?.record({
    directionId: direction.id,
    files: changed.map((group) => ({
      after: group.code,
      before: group.original,
      file: group.target.file,
      relative: group.target.relative,
    })),
    label: title,
    projectId: project.id,
    versionId: version.id,
  });
  await publishVersion(deps, project, direction, version);

  return {
    files: changed.map((group) => group.target.relative),
    versionId: version.id,
  };
};

const updatePageMatches = async (
  run: DirectionRun,
  command: PageMatchCommand
): Promise<PageMatchesUpdated> => {
  toHtmlProject(run.project);
  assertCanEdit(run.runtime.editDeps, run.project, run.direction);
  await savesSettled(run.project.id);
  const own = await resolveSource(run.direction.workTree, command.file);

  const source = toSource(
    await readFile(own.file, "utf-8"),
    command.selector,
    own.relative
  );

  const written = await Promise.all(
    command.targets.map((target) =>
      toWrittenFile(run, source, target, own.relative)
    )
  );

  const changed = written.filter((item): item is WrittenFile => item !== null);

  if (changed.length === 0) {
    throw new BadRequestError("Every target page already has this markup.");
  }

  return await applyPageCopies(run, source, changed);
};

export { updatePageMatches };
