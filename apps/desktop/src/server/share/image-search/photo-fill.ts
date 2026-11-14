import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { creditLine, planCredit } from "./credit.js";
import type { CreditEdit } from "./credit.js";
import {
  assertCanEdit,
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
import { isImageSearchOn } from "./gate.js";
import {
  applyPhotoArt,
  isRunDraft,
  toArtAssetFiles,
  toArtFreeStyle,
  toArtPlan,
  toWriteArtAssets,
} from "./photo-art.js";
import type { PhotoArtPlan } from "./photo-art.js";
import { toPicks } from "./photo-pick.js";
import type { PhotoFillScope, PhotoPage, PhotoPick } from "./photo-pick.js";
import {
  ART_ATTR,
  PHOTO_ATTR,
  isHtmlPage,
  isTypescriptPage,
  toPhotoSlots,
} from "./photo-slots.js";
import type { PhotoSlot } from "./photo-slots.js";
import {
  MISSED_ATTR,
  isMarkedMiss,
  toIdleNote,
  toLabelFree,
  toSkipNote,
} from "./photo-tag.js";

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
  readonly credit: CreditEdit | null;
}

interface PhotoFillPlan {
  readonly art: PhotoArtPlan;
  readonly misses: readonly PhotoSlot[];
  readonly picks: readonly PhotoPick[];
}

interface SlotEdit {
  readonly changes: AttrChanges;
  readonly isLabelFree: boolean;
  readonly slot: PhotoSlot;
}

interface PhotoFillRequest {
  readonly path: string;
  readonly slots: readonly string[] | null;
}

type SetAttrs = (
  code: string,
  position: { readonly col: number; readonly line: number },
  changes: AttrChanges
) => string;

const BACKGROUND_STYLE = "background-size: cover; background-position: center";

const TRAILING_SEMI = /;\s*$/u;

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
  const own = toArtFreeStyle(slot.style).replace(TRAILING_SEMI, "");
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
      [ART_ATTR]: null,
      [MISSED_ATTR]: null,
      [PHOTO_ATTR]: null,
      style: toBackgroundStyle(slot, pick.asset.src),
    } satisfies AttrChanges;
  }

  return {
    [ART_ATTR]: null,
    [MISSED_ATTR]: null,
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

const toSlotEdits = (
  plan: PhotoFillPlan,
  isHtml: boolean
): readonly SlotEdit[] => [
  ...plan.picks.map((pick) => ({
    changes: toPickChanges(pick),
    isLabelFree: isHtml && !pick.slot.isImg,
    slot: pick.slot,
  })),
  ...plan.misses.map((slot) => {
    const art = plan.art.changes.get(slot) ?? null;

    return {
      changes: { ...art, [MISSED_ATTR]: slot.query } satisfies AttrChanges,
      isLabelFree: art !== null && !slot.isImg,
      slot,
    };
  }),
];

const toFilledSource = (page: PhotoPage, plan: PhotoFillPlan): string => {
  const setAttrs = toAttrSetter(page.relative);

  const isHtml = isHtmlPage(page.relative);

  const ordered = toSlotEdits(plan, isHtml).toSorted(
    (left, right) =>
      right.slot.line - left.slot.line || right.slot.col - left.slot.col
  );

  let code = page.source;

  for (const edit of ordered) {
    const position = { col: edit.slot.col, line: edit.slot.line };

    if (edit.isLabelFree) {
      code = toLabelFree(code, position);
    }

    code = setAttrs(code, position, edit.changes);
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

const toWriteCredit = async (credit: CreditEdit | null): Promise<void> => {
  if (credit === null) {
    return;
  }

  if (credit.exists) {
    await writeAtomic(credit.file, credit.code);

    return;
  }

  await writeNewFile(credit.file, credit.code);
};

const toWriteFill = async (
  page: PhotoPage,
  edits: PhotoEdits,
  plan: PhotoFillPlan
): Promise<void> => {
  await Promise.all(plan.picks.map((pick) => toWriteAsset(pick)));
  await toWriteArtAssets(plan.art);
  await writeAtomic(page.file, edits.code);
  await toWriteCredit(edits.credit);
};

const toRecordHistory = (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  change: {
    readonly art: PhotoArtPlan;
    readonly edits: PhotoEdits;
    readonly page: PhotoPage;
  },
  version: Version
): void => {
  const { edits, page } = change;

  const credits = [edits.credit].flatMap((credit) => {
    if (credit === null) {
      return [];
    }

    return [
      {
        after: credit.code,
        before: credit.original,
        file: credit.file,
        relative: credit.relative,
      },
    ];
  });

  deps.history?.record({
    directionId: scope.direction.id,
    files: [
      {
        after: edits.code,
        before: page.source,
        file: page.file,
        relative: page.relative,
      },
      ...credits,
      ...toArtAssetFiles(change.art),
    ],
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const toFillTitle = (plan: PhotoFillPlan, relative: string): string => {
  if (plan.picks.length === 0) {
    return `Photo misses: ${plan.misses.length} on ${relative}`;
  }

  return `Photos: ${plan.picks.length} on ${relative}`;
};

const toCommitFill = async (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  page: PhotoPage,
  plan: PhotoFillPlan
): Promise<Version | null> => {
  const { picks } = plan;

  if (picks.length === 0 && plan.misses.length === 0) {
    return null;
  }

  const credit = await toCredits(scope.workTree, picks);
  const edits = { code: toFilledSource(page, plan), credit };

  if (isRunDraft(scope)) {
    await toWriteFill(page, edits, plan);

    return null;
  }

  const title = toFillTitle(plan, page.relative);

  const files = [
    page.relative,
    ...picks.map((pick) => pick.asset.relative),
    ...[credit?.relative ?? ""].filter(Boolean),
    ...toArtAssetFiles(plan.art).map((asset) => asset.relative),
  ];

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${title} at ${files.join(", ")}`,
  };

  const { direction, project } = scope;

  await runFileLockGuard(project.id, direction.id, files);
  await savesSettled(project.id);
  await toWriteFill(page, edits, plan);

  const version = saveDeferred(deps, project, direction, files, title, meta);

  toRecordHistory(deps, scope, { art: plan.art, edits, page }, version);
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

const toArtNote = (count: number, relative: string): string => {
  if (count === 0) {
    return `Image search is off. ${relative} has no plain ${PHOTO_ATTR} slot, so nothing changed.`;
  }

  return `Image search is off. The studio painted ${count} art slots.`;
};

const toArtFill = async (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  page: PhotoPage
): Promise<PhotoFillResult> => {
  const done = await applyPhotoArt(deps, scope, [page]);

  return {
    filled: [],
    missed: [],
    note: toArtNote(done.count, page.relative),
    versionId: done.versionId,
  };
};

const toPhotoFill = async (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  request: PhotoFillRequest
): Promise<PhotoFillResult> => {
  if (!isRunDraft(scope)) {
    assertCanEdit(deps, scope.project, scope.direction);
  }

  const page = await toReadPage(scope.workTree, request.path);

  if (!isImageSearchOn(scope.project)) {
    return await toArtFill(deps, scope, page);
  }

  const reopen = new Set(request.slots);
  const slots = toPhotoSlots(page.source);

  const skipped = slots.filter(
    (slot) => isMarkedMiss(page.source, slot) && !reopen.has(slot.query)
  );

  const skippedSet = new Set(skipped);
  const open = slots.filter((slot) => !skippedSet.has(slot));

  if (open.length === 0) {
    return {
      filled: [],
      missed: toMissed(skipped, []),
      note: toIdleNote(page.relative, skipped.length),
      versionId: null,
    };
  }

  const fillable = toFillable(page, open);
  const picks = await toPicks(scope, page, fillable);
  const picked = new Set(picks.map((pick) => pick.slot));
  const misses = fillable.filter((slot) => !picked.has(slot));
  const art = await toArtPlan(scope, page, misses);

  const version = await toCommitFill(deps, scope, page, {
    art,
    misses,
    picks,
  });

  return {
    filled: picks.map((pick) => ({
      photoId: pick.hit.id,
      query: pick.slot.query,
      selector: toFilledSelector(pick),
    })),
    missed: toMissed(slots, picks),
    note: toSkipNote(skipped.length),
    versionId: version?.id ?? null,
  };
};

export { toPhotoFill };

export type { PhotoFillRequest, PhotoFillResult, PhotoFillScope };
