import { commitBreakpointStyle, guardBreakpointEdit } from "./commit.js";
import type { BreakpointScope } from "./commit.js";
import {
  parseDirectEditRequest,
  planDirectEdit,
  prefixOf,
  scopedStyleOf,
} from "./deps.js";
import type {
  BreakpointStyleInput,
  BreakpointStyleResult,
  DirectEditDeps,
  DirectEditRequest,
  SourceLoc,
  Version,
  WrittenFile,
} from "./deps.js";
import { BreakpointError } from "./errors.js";
import { loadBreakpointSite } from "./site.js";

interface BreakpointTarget {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface BreakpointStyleRequest {
  readonly input: BreakpointStyleInput;
  readonly target: BreakpointTarget;
}

interface BreakpointStylePlan {
  readonly classes: BreakpointStyleResult["classes"];
  readonly input: BreakpointStyleInput;
  readonly mode: BreakpointStyleResult["mode"];
  readonly prefix: string;
  readonly title: string;
  readonly written: WrittenFile[];
}

interface BreakpointStyleDone {
  readonly plan: BreakpointStylePlan;
  readonly version: Version;
}

type EditStyle = NonNullable<DirectEditRequest["style"]>;

type Planned = Awaited<ReturnType<typeof planDirectEdit>>;

const SAME = "The layer already has this value at this breakpoint.";

const editRequest = (
  target: BreakpointTarget,
  edit: EditStyle,
  prefix: string
): DirectEditRequest => {
  const base = {
    selector: target.selector ?? "",
    source: target.source,
    style: edit,
    variant: prefix,
  };

  if (target.tag) {
    return parseDirectEditRequest({ ...base, tag: target.tag });
  }

  return parseDirectEditRequest(base);
};

const titleOf = (input: BreakpointStyleInput): string => {
  if (input.reset) {
    return `Breakpoint ${input.breakpoint}: reset ${input.property}`;
  }

  return `Breakpoint ${input.breakpoint}: ${input.property} ${input.value ?? ""}`;
};

const classesOf = (planned: Planned): BreakpointStyleResult["classes"] => {
  const delta = planned.patch.tailwind?.delta;

  if (planned.patch.tailwind?.mode !== "classes" || !delta) {
    return null;
  }

  return { add: delta.add, remove: delta.remove };
};

const modeOf = (planned: Planned): BreakpointStyleResult["mode"] => {
  if (planned.patch.tailwind?.mode === "classes") {
    return "classes";
  }

  return "css";
};

const resolved = <Value>(
  result: { ok: true; value: Value } | { code: string; ok: false }
): Value => {
  if (!result.ok) {
    throw new BreakpointError(result.code);
  }

  return result.value;
};

const planBreakpointStyle = async (
  scope: BreakpointScope,
  request: BreakpointStyleRequest
): Promise<BreakpointStylePlan> => {
  const site = await loadBreakpointSite(scope, request.target.source);

  const scopePrefix = resolved(
    prefixOf(site.set.list, request.input.breakpoint)
  );

  const style = resolved(scopedStyleOf(request.input)) as EditStyle;

  const planned = await planDirectEdit(
    scope.workTree,
    editRequest(request.target, style, scopePrefix),
    null,
    { projectKind: scope.project.kind }
  );

  if (planned.patch.code === planned.original) {
    throw new BreakpointError(SAME);
  }

  return {
    classes: classesOf(planned),
    input: request.input,
    mode: modeOf(planned),
    prefix: scopePrefix,
    title: titleOf(request.input),
    written: [
      {
        code: planned.patch.code,
        original: planned.original,
        target: planned.target,
      },
    ],
  };
};

const setBreakpointStyle = async (
  deps: DirectEditDeps,
  scope: BreakpointScope,
  request: BreakpointStyleRequest
): Promise<BreakpointStyleDone> => {
  guardBreakpointEdit(deps, scope);
  const plan = await planBreakpointStyle(scope, request);

  const version = await commitBreakpointStyle(
    deps,
    scope,
    plan.written,
    plan.title
  );

  return { plan, version };
};

const toBreakpointResult = (
  plan: BreakpointStylePlan,
  version: Version | null
): BreakpointStyleResult => ({
  breakpoint: plan.input.breakpoint,
  classes: plan.classes,
  files: plan.written.map((entry) => entry.target.relative),
  mode: plan.mode,
  prefix: plan.prefix,
  property: plan.input.property,
  title: plan.title,
  value: plan.input.value,
  versionId: version?.id ?? null,
});

export { planBreakpointStyle, setBreakpointStyle, toBreakpointResult };

export type {
  BreakpointStyleDone,
  BreakpointStylePlan,
  BreakpointStyleRequest,
  BreakpointTarget,
};
