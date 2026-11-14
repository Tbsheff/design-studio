import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { writeAtomic, writeNewFile } from "./deps.js";
import type { AttrChanges } from "./deps.js";
import { toArtHash, toPhotoArt } from "./engine/index.js";
import type { PhotoArtColors } from "./engine/index.js";
import { SHEET_NAME } from "./photo-art-colors.js";
import { toArtPalette } from "./photo-art-dark.js";
import type { ArtPalette, DarkForms } from "./photo-art-dark.js";
import {
  isArtPage,
  isJsxPage,
  toPageSlots,
  toSheetImported,
  toSlotLabel,
} from "./photo-art-jsx.js";
import { toSheetText, toSheetedHtml } from "./photo-art-sheet.js";
import type { SlotArtRule } from "./photo-art-sheet.js";
import type { PhotoFillScope, PhotoPage } from "./photo-pick.js";
import { ART_ATTR } from "./photo-slots.js";
import type { PhotoSlot } from "./photo-slots.js";

interface PhotoArtAsset {
  readonly exists: boolean;
  readonly file: string;
  readonly relative: string;
  readonly svg: string;
}

interface PhotoArtPlan {
  readonly assets: readonly PhotoArtAsset[];
  readonly changes: ReadonlyMap<PhotoSlot, AttrChanges>;
  readonly forms: DarkForms;
  readonly isRepaint: boolean;
  readonly rules: readonly SlotArtRule[];
  readonly sheet: ArtFileChange | null;
}

interface SlotArtSrc {
  readonly key: string;
  readonly src: string;
}

type SlotChanges = (
  page: PhotoPage,
  slot: PhotoSlot,
  art: SlotArtSrc
) => AttrChanges;

interface ArtFileChange {
  readonly after: string;
  readonly before: string;
  readonly created: boolean;
  readonly file: string;
  readonly relative: string;
}

const ART_FOLDER = "assets";

const ART_PREFIX = "photo-art-";

const NO_FORMS: DarkForms = { isClass: false, isMedia: false };

const ART_EXTRAS = new Set([
  "background-position: center",
  "background-size: cover",
]);

const SPACES = /\s+/gu;

const isArtImage = (part: string): boolean =>
  part.startsWith("background-image:") && part.includes(ART_PREFIX);

const toArtFreeStyle = (style: string | null): string => {
  const own = (style ?? "").trim();

  if (!own.includes(ART_PREFIX)) {
    return own;
  }

  return own
    .split(";")
    .map((part) => part.replaceAll(SPACES, " ").trim())
    .filter((part) => part !== "" && !isArtImage(part) && !ART_EXTRAS.has(part))
    .join("; ");
};

const isPlainSlot = (slot: PhotoSlot): boolean =>
  !slot.hasArt && !slot.hasImage;

const toReadText = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const isFile = async (file: string): Promise<boolean> => {
  try {
    const info = await stat(file);

    return info.isFile();
  } catch {
    return false;
  }
};

const toSlotKey = (slot: PhotoSlot): string =>
  toArtHash(`${slot.query}|${slot.orientation}|${String(slot.isImg)}`);

const toEmptyPlan = (isRepainting: boolean): PhotoArtPlan => ({
  assets: [],
  changes: new Map(),
  forms: NO_FORMS,
  isRepaint: isRepainting,
  rules: [],
  sheet: null,
});

const toPageRelative = (page: PhotoPage, relative: string): string =>
  path.posix.relative(path.posix.dirname(page.relative), relative);

const toSlotSrc = (page: PhotoPage, relative: string): string => {
  if (isJsxPage(page.relative)) {
    return `/${relative}`;
  }

  return toPageRelative(page, relative);
};

const toArtChanges = (
  page: PhotoPage,
  slot: PhotoSlot,
  art: SlotArtSrc
): AttrChanges => {
  if (slot.isImg) {
    return {
      [ART_ATTR]: art.key,
      alt: slot.alt ?? slot.query,
      src: art.src,
    } satisfies AttrChanges;
  }

  const position = { col: slot.col, line: slot.line };

  return {
    [ART_ATTR]: art.key,
    "aria-label":
      toSlotLabel(page.relative, page.source, position) ?? slot.query,
    role: "img",
  } satisfies AttrChanges;
};

const toRepaintChanges = (
  _page: PhotoPage,
  slot: PhotoSlot,
  art: SlotArtSrc
): AttrChanges => {
  if (slot.isImg) {
    return { [ART_ATTR]: art.key, src: art.src } satisfies AttrChanges;
  }

  if (!(slot.style ?? "").includes(ART_PREFIX)) {
    return { [ART_ATTR]: art.key } satisfies AttrChanges;
  }

  const own = toArtFreeStyle(slot.style);

  if (own === "") {
    return { [ART_ATTR]: art.key, style: null } satisfies AttrChanges;
  }

  return { [ART_ATTR]: art.key, style: own } satisfies AttrChanges;
};

const toChangesFor = (isRepaint: boolean): SlotChanges => {
  if (isRepaint) {
    return toRepaintChanges;
  }

  return toArtChanges;
};

const toArtSvg = (
  slot: PhotoSlot,
  colors: PhotoArtColors | null
): string | null => {
  if (colors === null) {
    return null;
  }

  return toPhotoArt({
    colors,
    orientation: slot.orientation,
    words: slot.query,
  });
};

const toArtRelative = (svg: string | null): string | null => {
  if (svg === null) {
    return null;
  }

  return `${ART_FOLDER}/${ART_PREFIX}${toArtHash(svg)}.svg`;
};

const toSheetChange = async (
  page: PhotoPage,
  rules: readonly SlotArtRule[],
  forms: DarkForms
): Promise<ArtFileChange | null> => {
  if (!isJsxPage(page.relative) || rules.length === 0) {
    return null;
  }

  const relative = path.posix.join(
    path.posix.dirname(page.relative),
    SHEET_NAME
  );

  const file = path.join(path.dirname(page.file), SHEET_NAME);
  const [isThere, before] = await Promise.all([isFile(file), toReadText(file)]);

  const after = toSheetText(before, rules, forms);
  const created = !isThere;

  if (after === before) {
    return null;
  }

  return { after, before, created, file, relative };
};

interface PlanDrafts {
  readonly changes: Map<PhotoSlot, AttrChanges>;
  readonly drafts: Map<string, Omit<PhotoArtAsset, "exists">>;
  readonly rules: SlotArtRule[];
}

const setSlotDrafts = (
  scope: PhotoFillScope,
  page: PhotoPage,
  slot: PhotoSlot,
  context: {
    readonly palette: ArtPalette;
    readonly plan: PlanDrafts;
    readonly toChanges: SlotChanges;
  }
): void => {
  const { palette, plan } = context;
  const light = toArtSvg(slot, palette.light) ?? "";
  const dark = toArtSvg(slot, palette.dark);
  const lightRelative = toArtRelative(light) ?? "";
  const darkRelative = toArtRelative(dark);
  const artKey = toSlotKey(slot);

  for (const [relative, svg] of [
    [lightRelative, light],
    [darkRelative, dark],
  ] as const) {
    if (relative !== null && svg !== null) {
      const file = path.join(scope.workTree, relative);

      plan.drafts.set(relative, { file, relative, svg });
    }
  }

  plan.rules.push({
    darkSrc: darkRelative && toPageRelative(page, darkRelative),
    isImg: slot.isImg,
    key: artKey,
    lightSrc: toPageRelative(page, lightRelative),
  });

  const src = toSlotSrc(page, lightRelative);

  plan.changes.set(slot, context.toChanges(page, slot, { key: artKey, src }));
};

const toPlanFor = async (
  scope: PhotoFillScope,
  page: PhotoPage,
  picked: readonly PhotoSlot[],
  isRepainting: boolean
): Promise<PhotoArtPlan> => {
  if (!isArtPage(scope.project, page.relative) || picked.length === 0) {
    return toEmptyPlan(isRepainting);
  }

  const palette = await toArtPalette(scope.workTree, page);
  const plan: PlanDrafts = { changes: new Map(), drafts: new Map(), rules: [] };
  const toChanges = toChangesFor(isRepainting);

  for (const slot of picked) {
    setSlotDrafts(scope, page, slot, { palette, plan, toChanges });
  }

  const listed = [...plan.drafts.values()];
  const found = await Promise.all(listed.map((draft) => isFile(draft.file)));

  const assets = listed.map((draft, index) => ({
    exists: found[index] ?? false,
    file: draft.file,
    relative: draft.relative,
    svg: draft.svg,
  }));

  return {
    assets,
    changes: plan.changes,
    forms: palette.forms,
    isRepaint: isRepainting,
    rules: plan.rules,
    sheet: await toSheetChange(page, plan.rules, palette.forms),
  };
};

const toArtPlan = async (
  scope: PhotoFillScope,
  page: PhotoPage,
  slots: readonly PhotoSlot[]
): Promise<PhotoArtPlan> =>
  await toPlanFor(
    scope,
    page,
    slots.filter((slot) => isPlainSlot(slot)),
    false
  );

const toRepaintPlan = async (
  scope: PhotoFillScope,
  page: PhotoPage
): Promise<PhotoArtPlan> =>
  await toPlanFor(
    scope,
    page,
    toPageSlots(page).filter((slot) => slot.hasArt),
    true
  );

const toArtCode = (
  page: PhotoPage,
  code: string,
  plan: PhotoArtPlan
): string => {
  if (plan.rules.length === 0) {
    return code;
  }

  if (isJsxPage(page.relative)) {
    return toSheetImported(code, page.relative);
  }

  return toSheetedHtml(code, plan.rules, plan.forms);
};

const toArtAssetFiles = (plan: PhotoArtPlan): readonly ArtFileChange[] => {
  const svgs = plan.assets.flatMap((asset) => {
    if (asset.exists) {
      return [];
    }

    return [
      {
        after: asset.svg,
        before: "",
        created: true,
        file: asset.file,
        relative: asset.relative,
      },
    ];
  });

  if (plan.sheet === null) {
    return svgs;
  }

  return [...svgs, plan.sheet];
};

const toWriteSheet = async (sheet: ArtFileChange | null): Promise<void> => {
  if (sheet === null) {
    return;
  }

  if (sheet.created) {
    await writeNewFile(sheet.file, sheet.after);

    return;
  }

  await writeAtomic(sheet.file, sheet.after);
};

const toWriteArtAssets = async (plan: PhotoArtPlan): Promise<void> => {
  const fresh = plan.assets.filter((asset) => !asset.exists);

  await Promise.all(
    fresh.map(async (asset) => {
      if (!(await isFile(asset.file))) {
        await writeNewFile(asset.file, asset.svg);
      }
    })
  );

  await toWriteSheet(plan.sheet);
};

export {
  isFile,
  toArtAssetFiles,
  toArtCode,
  toArtFreeStyle,
  toArtPlan,
  toReadText,
  toRepaintPlan,
  toWriteArtAssets,
};

export type { ArtFileChange, PhotoArtPlan };
