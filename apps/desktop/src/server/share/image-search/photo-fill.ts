import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { creditLine, planCredit } from "./credit.js";
import type { CreditEdit } from "./credit.js";
import {
  assertCanEdit,
  isOwnAgentRun,
  publishVersion,
  resolveSource,
  runFileLockGuard,
  saveDeferred,
  savesSettled,
  setHtmlAttrs,
  setJsxAttrs,
  writeAtomic,
  writeNewFile,
} from "./deps.js";
import type {
  AttrChanges,
  DirectEditDeps,
  Version,
  VersionMeta,
} from "./deps.js";
import { requireImageSearch } from "./gate.js";
import { toPicks } from "./photo-pick.js";
import type { PhotoFillScope, PhotoPage, PhotoPick } from "./photo-pick.js";
import {
  PHOTO_ATTR,
  isHtmlPage,
  isTypescriptPage,
  toPhotoSlots,
} from "./photo-slots.js";
import type { PhotoSlot } from "./photo-slots.js";

interface PhotoSlotFill {
  readonly photoId: string;
  readonly query: string;
  readonly selector: string;
}

interface PhotoSlotMiss {
  readonly query: string;
  readonly selector: string;
}

interface PhotoFillResult {
  readonly filled: readonly PhotoSlotFill[];
  readonly missed: readonly PhotoSlotMiss[];
  readonly note: string | null;
  readonly versionId: string | null;
}

interface PhotoEdits {
  readonly code: string;
  readonly credit: CreditEdit;
}

type SetAttrs = (
  code: string,
  position: { readonly col: number; readonly line: number },
  changes: AttrChanges
) => string;

const BACKGROUND_STYLE = "background-size: cover; background-position: center";

const TRAILING_SEMI = /;\s*$/u;

const TAG_NAME = /^<(?<tag>[A-Za-z][\w-]*)/u;

const TAG_NAME_MAX = 64;

const LABEL_TAG =
  /^<(?<label>span|small|p|strong|em|b|i)\b[^<>]*>[^<]*<\/\k<label>>$/u;

const toOffset = (
  code: string,
  position: { readonly col: number; readonly line: number }
): number => {
  const lines = code.split("\n").slice(0, position.line - 1);

  return (
    lines.reduce((sum, line) => sum + line.length + 1, 0) + position.col - 1
  );
};

const toQuote = (quote: string, char: string): string => {
  if (quote !== "") {
    if (char === quote) {
      return "";
    }

    return quote;
  }

  if (char === '"' || char === "'") {
    return char;
  }

  return "";
};

const toTagEnd = (code: string, from: number): number => {
  let quote = "";

  for (let index = from; index < code.length; index += 1) {
    const char = code.charAt(index);

    if (quote === "" && char === ">") {
      return index + 1;
    }

    quote = toQuote(quote, char);
  }

  return -1;
};

const toLabelFree = (
  code: string,
  position: { readonly col: number; readonly line: number }
): string => {
  const offset = toOffset(code, position);
  const head = code.slice(offset, offset + TAG_NAME_MAX);
  const tag = TAG_NAME.exec(head)?.groups?.tag ?? "";

  const start = toTagEnd(code, offset);

  if (tag === "" || start === -1) {
    return code;
  }

  const end = code.indexOf(`</${tag}>`, start);
  const inner = code.slice(start, Math.max(end, start));

  if (end === -1 || inner.trim() === "") {
    return code;
  }

  if (inner.includes("<") && !LABEL_TAG.test(inner.trim())) {
    return code;
  }

  return `${code.slice(0, start)}${code.slice(end)}`;
};

const toSlotSelector = (slot: PhotoSlot): string => {
  const words = slot.query.replaceAll('"', String.raw`\"`);

  return `[${PHOTO_ATTR}="${words}"]`;
};

const toFilledSelector = (pick: PhotoPick): string => {
  if (pick.slot.isImg) {
    return `img[src="${pick.asset.src}"]`;
  }

  return `[style*="${pick.asset.src}"]`;
};

const toBackgroundStyle = (slot: PhotoSlot, src: string): string => {
  const own = (slot.style ?? "").trim().replace(TRAILING_SEMI, "");
  const added = `background-image: url(${src}); ${BACKGROUND_STYLE}`;

  if (own === "") {
    return added;
  }

  return `${own}; ${added}`;
};

const toPickChanges = (pick: PhotoPick): AttrChanges => {
  const { slot } = pick;

  if (!slot.isImg) {
    return {
      [PHOTO_ATTR]: null,
      style: toBackgroundStyle(slot, pick.asset.src),
    } satisfies AttrChanges;
  }

  return {
    [PHOTO_ATTR]: null,
    alt: slot.alt ?? slot.query,
    src: pick.asset.src,
  } satisfies AttrChanges;
};

const toAttrSetter = (relative: string): SetAttrs => {
  if (isHtmlPage(relative)) {
    return setHtmlAttrs;
  }

  const isTypescript = isTypescriptPage(relative);

  return (code, position, changes) =>
    setJsxAttrs(code, position, isTypescript, changes);
};

const toFilledSource = (
  page: PhotoPage,
  picks: readonly PhotoPick[]
): string => {
  const setAttrs = toAttrSetter(page.relative);

  const ordered = picks.toSorted(
    (left, right) =>
      right.slot.line - left.slot.line || right.slot.col - left.slot.col
  );

  let code = page.source;

  const isHtml = isHtmlPage(page.relative);

  for (const pick of ordered) {
    const position = { col: pick.slot.col, line: pick.slot.line };

    if (isHtml && !pick.slot.isImg) {
      code = toLabelFree(code, position);
    }

    code = setAttrs(code, position, toPickChanges(pick));
  }

  return code;
};

const toCredits = async (
  workTree: string,
  picks: readonly PhotoPick[]
): Promise<CreditEdit | null> => {
  const [first, ...rest] = picks;

  if (!first) {
    return null;
  }

  const base = await planCredit(workTree, first.hit, first.asset.relative);

  let { code } = base;

  for (const pick of rest) {
    if (!code.includes(`(openverse ${pick.hit.id})`)) {
      code = `${code}${creditLine(pick.hit, pick.asset.relative)}\n`;
    }
  }

  return { ...base, code };
};

const toReadPage = async (
  workTree: string,
  page: string
): Promise<PhotoPage> => {
  const resolved = await resolveSource(workTree, page);
  const source = await readFile(resolved.file, "utf-8");

  return { file: resolved.file, relative: resolved.relative, source };
};

const toWriteAsset = async (pick: PhotoPick): Promise<void> => {
  if (pick.asset.exists) {
    return;
  }

  await mkdir(path.dirname(pick.asset.file), { recursive: true });

  try {
    await writeFile(pick.asset.file, pick.asset.bytes, { flag: "wx" });
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "EEXIST")
    ) {
      throw error;
    }
  }
};

const toWriteCredit = async (credit: CreditEdit): Promise<void> => {
  if (credit.exists) {
    await writeAtomic(credit.file, credit.code);

    return;
  }

  await writeNewFile(credit.file, credit.code);
};

const toWriteFill = async (
  page: PhotoPage,
  edits: PhotoEdits,
  picks: readonly PhotoPick[]
): Promise<void> => {
  await Promise.all(picks.map((pick) => toWriteAsset(pick)));
  await writeAtomic(page.file, edits.code);
  await toWriteCredit(edits.credit);
};

const isRunDraft = (scope: PhotoFillScope): boolean =>
  scope.direction.headVersionId === null &&
  isOwnAgentRun(scope.project.id, scope.direction.id);

const toRecordHistory = (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  change: { readonly edits: PhotoEdits; readonly page: PhotoPage },
  version: Version
): void => {
  const { edits, page } = change;

  deps.history?.record({
    directionId: scope.direction.id,
    files: [
      {
        after: edits.code,
        before: page.source,
        file: page.file,
        relative: page.relative,
      },
      {
        after: edits.credit.code,
        before: edits.credit.original,
        file: edits.credit.file,
        relative: edits.credit.relative,
      },
    ],
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const toCommitFill = async (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  page: PhotoPage,
  picks: readonly PhotoPick[]
): Promise<Version | null> => {
  const credit = await toCredits(scope.workTree, picks);

  if (credit === null) {
    return null;
  }

  const edits = { code: toFilledSource(page, picks), credit };

  if (isRunDraft(scope)) {
    await toWriteFill(page, edits, picks);

    return null;
  }

  const title = `Photos: ${picks.length} on ${page.relative}`;

  const files = [
    page.relative,
    ...picks.map((pick) => pick.asset.relative),
    credit.relative,
  ];

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${title} at ${files.join(", ")}`,
  };

  const { direction, project } = scope;

  await runFileLockGuard(project.id, direction.id, files);
  await savesSettled(project.id);
  await toWriteFill(page, edits, picks);

  const version = saveDeferred(deps, project, direction, files, title, meta);

  toRecordHistory(deps, scope, { edits, page }, version);
  await publishVersion(deps, project, direction, version);

  return version;
};

const toMissed = (
  slots: readonly PhotoSlot[],
  picks: readonly PhotoPick[]
): readonly PhotoSlotMiss[] => {
  const filled = new Set(picks.map((pick) => pick.slot));

  return slots.flatMap((slot) => {
    if (filled.has(slot)) {
      return [];
    }

    return [{ query: slot.query, selector: toSlotSelector(slot) }];
  });
};

const toFillable = (
  page: PhotoPage,
  slots: readonly PhotoSlot[]
): readonly PhotoSlot[] => {
  if (isHtmlPage(page.relative)) {
    return slots;
  }

  return slots.filter((slot) => slot.isImg);
};

const toPhotoFill = async (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  pagePath: string
): Promise<PhotoFillResult> => {
  requireImageSearch(scope.project);

  if (!isRunDraft(scope)) {
    assertCanEdit(deps, scope.project, scope.direction);
  }

  const page = await toReadPage(scope.workTree, pagePath);
  const slots = toPhotoSlots(page.source);

  if (slots.length === 0) {
    return {
      filled: [],
      missed: [],
      note: `${page.relative} has no ${PHOTO_ATTR} slot left, so nothing changed and no search ran. Do not call apply_image_search again on this page. To add a photo, write an img or element with ${PHOTO_ATTR}="<2 to 6 search words>".`,
      versionId: null,
    };
  }

  const picks = await toPicks(scope, page, toFillable(page, slots));
  const version = await toCommitFill(deps, scope, page, picks);

  return {
    filled: picks.map((pick) => ({
      photoId: pick.hit.id,
      query: pick.slot.query,
      selector: toFilledSelector(pick),
    })),
    missed: toMissed(slots, picks),
    note: null,
    versionId: version?.id ?? null,
  };
};

export { toPhotoFill };

export type { PhotoFillResult, PhotoFillScope };
