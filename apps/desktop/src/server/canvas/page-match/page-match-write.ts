import { readFile } from "node:fs/promises";

import type {
  PageMatchesUpdated,
  PageMatchSkip,
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
import type { ElementSpot } from "./engine/to-element-spot.js";
import { toMarkedMarkup } from "./engine/to-marked-markup.js";
import { toElementNormal } from "./engine/to-page-matches.js";
import type { PageSource } from "./engine/to-page-matches.js";
import { toMarkupHash } from "./page-match-hash.js";
import { toHtmlProject, toSource } from "./page-match-read.js";
import type { PageMatchCommand } from "./page-match-read.js";

const toChanged = (file: string): string =>
  `${file} changed since inspect_matches_page. Call inspect_matches_page again.`;

type PageCopy =
  | { readonly kind: "write"; readonly file: WrittenFile }
  | { readonly kind: "same" }
  | { readonly kind: "skip"; readonly skip: PageMatchSkip };

const ALL_CHANGED =
  "Every target page changed since inspect_matches_page. Call inspect_matches_page again, then try again.";

const toSkip = (file: string, reason: PageMatchSkip["reason"]): PageCopy => ({
  kind: "skip",
  skip: { file, reason },
});

const toCheckedSkip = (
  target: PageMatchTarget,
  file: string,
  spot: ElementSpot | null
): PageCopy | null => {
  if (target.markupHash === null) {
    return null;
  }

  if (spot === null) {
    return toSkip(file, "missing");
  }

  if (toMarkupHash(toElementNormal(spot)) !== target.markupHash) {
    return toSkip(file, "changed");
  }

  return null;
};

const toPageCopy = async (
  run: DirectionRun,
  source: PageSource,
  target: PageMatchTarget,
  own: string
): Promise<PageCopy> => {
  const resolved = await resolveSource(run.direction.workTree, target.file);

  if (resolved.relative === own) {
    throw new BadRequestError(
      `${own} is the source page. Leave it out of targets.`
    );
  }

  const original = await readFile(resolved.file, "utf-8");
  const spot = toElementSpot(original, target.selector);
  const skip = toCheckedSkip(target, resolved.relative, spot);

  if (skip !== null) {
    return skip;
  }

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
    return { kind: "same" };
  }

  return { file: { code, original, target: resolved }, kind: "write" };
};

const toWrittenFiles = (copies: readonly PageCopy[]): WrittenFile[] => {
  const files: WrittenFile[] = [];

  for (const copy of copies) {
    if (copy.kind === "write") {
      files.push(copy.file);
    }
  }

  return files;
};

const toSkips = (copies: readonly PageCopy[]): PageMatchSkip[] => {
  const skips: PageMatchSkip[] = [];

  for (const copy of copies) {
    if (copy.kind === "skip") {
      skips.push(copy.skip);
    }
  }

  return skips;
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
  changed: WrittenFile[],
  skips: readonly PageMatchSkip[]
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
    skipped: skips,
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

  const copies = await Promise.all(
    command.targets.map((target) =>
      toPageCopy(run, source, target, own.relative)
    )
  );

  const changed = toWrittenFiles(copies);
  const skipped = toSkips(copies);

  if (changed.length === 0 && skipped.length === command.targets.length) {
    throw new ConflictError(ALL_CHANGED);
  }

  if (changed.length === 0) {
    throw new BadRequestError("Every target page already has this markup.");
  }

  return await applyPageCopies(run, source, changed, skipped);
};

export { updatePageMatches };
