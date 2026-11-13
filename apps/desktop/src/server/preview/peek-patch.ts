import {
  SOURCE_LOC_ATTR,
  projectPreviewOrigin,
} from "@design-studio/contracts";
import type { DomPatch } from "@design-studio/contracts";

import { onPlannedEdit } from "../events/index.js";
import type { SourceChange } from "../events/index.js";

interface PeekPatch {
  readonly expression: string;
  readonly isTarget: (url: string) => boolean;
}

interface PlannedPatches {
  readonly at: number;
  readonly patches: readonly DomPatch[];
}

interface PagePatch {
  readonly selector: string;
  readonly loc: string;
  readonly tag: string | null;
  readonly text: string | null;
  readonly add: readonly string[];
  readonly remove: readonly string[];
  readonly style: readonly (readonly [string, string | null])[];
}

const PLAN_MS = 2000;

const planned = new Map<string, PlannedPatches>();

const toKey = (projectId: string, directionId: string): string =>
  `${projectId}:${directionId}`;

const toPagePatch = (patch: DomPatch): PagePatch | null => {
  const sourceLoc = patch.loc ?? null;

  if (sourceLoc === null) {
    return null;
  }

  return {
    add: patch.classes?.add ?? [],
    loc: sourceLoc,
    remove: patch.classes?.remove ?? [],
    selector: patch.selector,
    style: Object.entries(patch.style ?? {}),
    tag: patch.tag ?? null,
    text: patch.text ?? null,
  };
};

const toPatchExpression = (patches: readonly PagePatch[]): string => `(() => {
  const clock = window.__studioWarm;
  const attr = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const find = (patch) => {
    let el = null;
    try { el = document.querySelector(patch.selector); } catch { el = null; }
    if (el && el.getAttribute(attr) === patch.loc) return el;
    return [...document.querySelectorAll('[' + attr + ']')].find((node) => node.getAttribute(attr) === patch.loc) || null;
  };
  const textOnly = (el) => [...el.childNodes].every((node) => node.nodeType === 3);
  const fits = (patch, el) => Boolean(el) && (!patch.tag || el.tagName.toLowerCase() === patch.tag.toLowerCase()) && (patch.text === null || textOnly(el));
  const patches = ${JSON.stringify(patches)};
  const targets = patches.map(find);
  if (!patches.every((patch, index) => fits(patch, targets[index]))) return false;
  if (clock) clock.paused = true;
  patches.forEach((patch, index) => {
    const el = targets[index];
    if (patch.text !== null) el.textContent = patch.text;
    patch.remove.forEach((name) => el.classList.remove(name));
    patch.add.forEach((name) => el.classList.add(name));
    patch.style.forEach(([prop, value]) => { if (value === null) el.style.removeProperty(prop); else el.style.setProperty(prop, value); });
  });
  return Promise.resolve().then(() => { if (clock) clock.paused = false; return true; });
})()`;

const toHtmlBase = (
  projectId: string,
  directionId: string,
  previewPort: number
): string =>
  `${projectPreviewOrigin(projectId, previewPort)}/d/${encodeURIComponent(projectId)}/${encodeURIComponent(directionId)}/`;

const isPatchOfFiles = (
  patch: PagePatch,
  files: readonly { relative: string }[]
): boolean => files.some((file) => patch.loc.startsWith(`${file.relative}:`));

const startPlannedPatchFeed = (): (() => void) =>
  onPlannedEdit((edit) => {
    const key = toKey(edit.projectId, edit.directionId);

    if (edit.kind === "planned") {
      planned.set(key, { at: Date.now(), patches: edit.patches });

      return;
    }

    planned.delete(key);
  });

const toPeekPatch = (
  change: SourceChange,
  isKept: boolean,
  previewPort: number
): PeekPatch | null => {
  const key = toKey(change.projectId, change.directionId);
  const plan = planned.get(key) ?? null;

  planned.delete(key);

  if (!isKept || plan === null || Date.now() - plan.at > PLAN_MS) {
    return null;
  }

  const patches = plan.patches.map((patch) => toPagePatch(patch));

  const kept = patches.filter(
    (patch): patch is PagePatch =>
      patch !== null && isPatchOfFiles(patch, change.files)
  );

  if (kept.length === 0 || kept.length !== patches.length) {
    return null;
  }

  const base = toHtmlBase(change.projectId, change.directionId, previewPort);

  return {
    expression: toPatchExpression(kept),
    isTarget: (url) => url.startsWith(base),
  };
};

export { startPlannedPatchFeed, toPeekPatch };

export type { PeekPatch };
