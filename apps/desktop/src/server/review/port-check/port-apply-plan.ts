import type {
  PortSkip,
  PortSkipReason,
  PortWrite,
} from "@design-studio/actions/port/schema";
import { DIRECT_STYLE_PROPERTIES } from "@design-studio/contracts";
import type {
  DirectEditRequest,
  DirectStyleProperty,
  Project,
  TailwindOutcome,
} from "@design-studio/contracts";

import { planDirectEdit } from "../../direct-edit/index.js";
import type {
  PortApplyEdit,
  PortApplyPart,
  PortApplyPlan,
} from "./port-apply.js";

interface PortApplyTarget {
  readonly projectKind: Project["kind"];
  readonly workTree: string;
}

interface PortWritePlan {
  readonly requests: readonly DirectEditRequest[];
  readonly skipped: readonly PortSkip[];
  readonly writes: readonly PortWrite[];
}

interface EditPlan {
  readonly request: DirectEditRequest | null;
  readonly skipped: readonly PortSkip[];
  readonly writes: readonly PortWrite[];
}

interface DryRun {
  readonly file: string;
  readonly tailwind: TailwindOutcome | null;
}

const STYLE_NAMES: ReadonlySet<string> = new Set(DIRECT_STYLE_PROPERTIES);

const isStyleName = (name: string): name is DirectStyleProperty =>
  STYLE_NAMES.has(name);

const toStyle = (
  style: Readonly<Record<string, string>>
): Partial<Record<DirectStyleProperty, string>> =>
  Object.fromEntries(
    Object.entries(style).filter(([name]) => isStyleName(name))
  );

const toRequest = (
  edit: PortApplyEdit,
  style: Readonly<Record<string, string>>
): DirectEditRequest => ({
  selector: edit.selector,
  source: { ...edit.source },
  style: toStyle(style),
});

const runDry = async (
  target: PortApplyTarget,
  request: DirectEditRequest
): Promise<DryRun | null> => {
  try {
    const planned = await planDirectEdit(target.workTree, request, null, {
      projectKind: target.projectKind,
    });

    return {
      file: planned.target.relative,
      tailwind: planned.patch.tailwind ?? null,
    };
  } catch {
    return null;
  }
};

const isClassWrite = (tailwind: TailwindOutcome | null): boolean =>
  tailwind === null || (tailwind.mode === "classes" && !tailwind.dynamic);

const toEditSkips = (
  edit: PortApplyEdit,
  skipReason: PortSkipReason
): PortSkip[] =>
  edit.parts.map((part) => ({
    app: part.diff.app,
    property: part.diff.property,
    prototype: part.diff.prototype,
    reason: skipReason,
    selector: edit.selector,
    text: edit.text,
  }));

const toDeclarations = (style: Readonly<Record<string, string>>): string =>
  Object.entries(style)
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");

const toWrittenText = (part: PortApplyPart, run: DryRun | null): string => {
  const delta = run?.tailwind?.delta ?? null;

  if (delta === null || delta.add.length === 0) {
    return toDeclarations(part.style);
  }

  if (delta.remove.length === 0) {
    return delta.add.join(" ");
  }

  return `${delta.add.join(" ")} (was ${delta.remove.join(" ")})`;
};

const toPartWrite = async (
  target: PortApplyTarget,
  edit: PortApplyEdit,
  part: PortApplyPart,
  fileName: string
): Promise<PortWrite> => {
  const run = await runDry(target, toRequest(edit, part.style));

  return {
    app: part.diff.app,
    file: fileName,
    property: part.diff.property,
    prototype: part.diff.prototype,
    selector: edit.selector,
    text: edit.text,
    written: toWrittenText(part, run),
  };
};

const toEditPlan = async (
  target: PortApplyTarget,
  edit: PortApplyEdit
): Promise<EditPlan> => {
  const request = toRequest(edit, edit.style);
  const run = await runDry(target, request);

  if (run === null) {
    return {
      request: null,
      skipped: toEditSkips(edit, "not-written"),
      writes: [],
    };
  }

  if (!isClassWrite(run.tailwind)) {
    return {
      request: null,
      skipped: toEditSkips(edit, "dynamic-site"),
      writes: [],
    };
  }

  const partWrites = await Promise.all(
    edit.parts.map((part) => toPartWrite(target, edit, part, run.file))
  );

  return { request, skipped: [], writes: partWrites };
};

const inspectPortWrites = async (
  target: PortApplyTarget,
  plan: PortApplyPlan
): Promise<PortWritePlan> => {
  const edits = await Promise.all(
    plan.edits.map((edit) => toEditPlan(target, edit))
  );

  return {
    requests: edits.flatMap((edit) => {
      if (edit.request === null) {
        return [];
      }

      return [edit.request];
    }),
    skipped: [...edits.flatMap((edit) => edit.skipped), ...plan.skipped],
    writes: edits.flatMap((edit) => edit.writes),
  };
};

export { inspectPortWrites };

export type { PortApplyTarget, PortWritePlan };
