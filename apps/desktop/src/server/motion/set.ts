import {
  diffClasses,
  isEmpty,
  keyframeEntranceClass,
  libEntranceClasses,
  transitionClasses,
} from "./classes.js";
import type { ClassChanges } from "./classes.js";
import { commitAll, guardEdit } from "./commit.js";
import type { MotionEditScope } from "./commit.js";
import {
  entranceLines,
  keyframeLine,
  upsertCss,
  upsertHtmlBlock,
} from "./css.js";
import type { SheetEdit } from "./css.js";
import { parseDirectEditRequest, planDirectEdit } from "./deps.js";
import type {
  DirectEditDeps,
  MotionEntrance,
  MotionKind,
  MotionMode,
  MotionSpec,
  SourceLoc,
  Version,
  WrittenFile,
} from "./deps.js";
import { cssEntry, hasAnimateLib } from "./files.js";
import { cssModeLines, newMarker } from "./sheet.js";
import { loadSite, MotionError } from "./site.js";
import type { MotionScope, MotionSite } from "./site.js";

interface MotionTarget {
  selector?: string | undefined;
  source: SourceLoc;
  tag?: string | undefined;
}

interface MotionSetRequest {
  spec: MotionSpec;
  target: MotionTarget;
}

interface MotionSetPlan {
  classes: ClassChanges | null;
  kind: MotionKind;
  mode: MotionMode;
  title: string;
  written: WrittenFile[];
}

interface MotionSetDone {
  plan: MotionSetPlan;
  version: Version;
}

interface MotionIntent {
  classes: ClassChanges;
  sheet: SheetEdit;
}

interface TailwindPlan {
  add: string[];
  marker: string | null;
  sheet: string[];
}

const NO_CHANGE: ClassChanges = { add: [], remove: [] };

const NO_CSS_ENTRY =
  "No app CSS entry file (src/index.css, app/globals.css and kin) was found for the motion rules.";

const tailwindEntrance = (
  site: MotionSite,
  spec: MotionEntrance,
  lib: boolean
): TailwindPlan => {
  const fromLib = lib && libEntranceClasses(spec);

  if (fromLib) {
    return { add: fromLib, marker: site.marker, sheet: [] };
  }

  if (spec.staggerMs > 0) {
    const id = site.marker ?? newMarker();
    const lines = [keyframeLine(spec.preset), ...entranceLines(id, spec)];

    return { add: [id], marker: id, sheet: lines };
  }

  return {
    add: [keyframeEntranceClass(spec)],
    marker: site.marker,
    sheet: [keyframeLine(spec.preset)],
  };
};

const tailwindPlan = async (
  scope: MotionScope,
  site: MotionSite,
  spec: MotionSpec
): Promise<TailwindPlan> => {
  if (spec.kind === "transition") {
    return { add: transitionClasses(spec), marker: site.marker, sheet: [] };
  }

  if (spec.kind === "entrance") {
    const entry = await cssEntry(scope.workTree);
    const lib = await hasAnimateLib(scope.workTree, entry);

    return tailwindEntrance(site, spec, lib);
  }

  return { add: [], marker: site.marker, sheet: [] };
};

const tailwindIntent = async (
  scope: MotionScope,
  site: MotionSite,
  spec: MotionSpec
): Promise<MotionIntent> => {
  const plan = await tailwindPlan(scope, site, spec);

  return {
    classes: diffClasses(site.classes, spec.kind, plan.add),
    sheet: { add: plan.sheet, kind: spec.kind, marker: plan.marker },
  };
};

const removeMarker = (marker: string | null): ClassChanges => {
  if (marker === null) {
    return NO_CHANGE;
  }

  return { add: [], remove: [marker] };
};

const addMarker = (existing: string | null, marker: string): ClassChanges => {
  if (existing !== null) {
    return NO_CHANGE;
  }

  return { add: [marker], remove: [] };
};

const cssIntent = (site: MotionSite, spec: MotionSpec): MotionIntent => {
  if (spec.kind === "none") {
    return {
      classes: removeMarker(site.marker),
      sheet: { add: [], kind: "none", marker: site.marker },
    };
  }

  const marker = site.marker ?? newMarker();

  return {
    classes: addMarker(site.marker, marker),
    sheet: { add: cssModeLines(spec, marker), kind: spec.kind, marker },
  };
};

const intentOf = (
  scope: MotionScope,
  site: MotionSite,
  spec: MotionSpec
): Promise<MotionIntent> => {
  if (site.mode === "classes") {
    return tailwindIntent(scope, site, spec);
  }

  return Promise.resolve(cssIntent(site, spec));
};

const elementCode = async (
  scope: MotionScope,
  site: MotionSite,
  target: MotionTarget,
  classes: ClassChanges
): Promise<string> => {
  if (isEmpty(classes)) {
    return site.original;
  }

  const request = parseDirectEditRequest({
    classes,
    selector: target.selector ?? "",
    source: target.source,
    tag: target.tag,
  });

  const planned = await planDirectEdit(scope.workTree, request, null, {
    projectKind: scope.project.kind,
  });

  return planned.patch.code;
};

const sheetFile = async (
  scope: MotionScope,
  sheet: SheetEdit
): Promise<WrittenFile | null> => {
  if (sheet.add.length === 0 && sheet.marker === null) {
    return null;
  }

  const entry = await cssEntry(scope.workTree);

  if (!entry) {
    if (sheet.add.length > 0) {
      throw new MotionError(NO_CSS_ENTRY);
    }

    return null;
  }

  const code = upsertCss(entry.text, sheet);

  if (code === entry.text) {
    return null;
  }

  return {
    code,
    original: entry.text,
    target: { file: entry.file, relative: entry.relative },
  };
};

const writtenFiles = async (
  scope: MotionScope,
  site: MotionSite,
  target: MotionTarget,
  intent: MotionIntent
): Promise<WrittenFile[]> => {
  let code = await elementCode(scope, site, target, intent.classes);
  const out: WrittenFile[] = [];

  if (site.html) {
    code = upsertHtmlBlock(code, intent.sheet);
  } else {
    const sheet = await sheetFile(scope, intent.sheet);

    if (sheet) {
      out.push(sheet);
    }
  }

  if (code !== site.original) {
    out.unshift({
      code,
      original: site.original,
      target: { file: site.file, relative: site.relative },
    });
  }

  return out;
};

const titleOf = (spec: MotionSpec): string => {
  if (spec.kind === "transition") {
    return `Motion: ${spec.state ?? "base"} transition`;
  }

  if (spec.kind === "entrance") {
    return `Motion: ${spec.preset} entrance`;
  }

  return "Motion removed";
};

const changedOrNull = (classes: ClassChanges): ClassChanges | null => {
  if (isEmpty(classes)) {
    return null;
  }

  return classes;
};

const planMotionSet = async (
  scope: MotionScope,
  request: MotionSetRequest
): Promise<MotionSetPlan> => {
  const site = await loadSite(scope, request.target.source);
  const intent = await intentOf(scope, site, request.spec);
  const written = await writtenFiles(scope, site, request.target, intent);

  if (written.length === 0) {
    throw new MotionError("The element already has this motion.");
  }

  return {
    classes: changedOrNull(intent.classes),
    kind: request.spec.kind,
    mode: site.mode,
    title: titleOf(request.spec),
    written,
  };
};

const setMotion = async (
  deps: DirectEditDeps,
  scope: MotionEditScope,
  request: MotionSetRequest
): Promise<MotionSetDone> => {
  guardEdit(deps, scope);
  const plan = await planMotionSet(scope, request);
  const version = await commitAll(deps, scope, plan.written, plan.title);

  return { plan, version };
};

export { planMotionSet, setMotion };

export type { MotionSetDone, MotionSetPlan, MotionSetRequest, MotionTarget };
