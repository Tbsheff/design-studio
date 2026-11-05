import {
  commitScopedStyle,
  guardScopedEdit,
  loadStyleSite,
  parseDirectEditRequest,
  planDirectEdit,
  scopedStyleOf,
  statePrefixOf,
} from "./deps.js";
import type {
  DirectEditDeps,
  DirectEditRequest,
  SourceLoc,
  StateStyleInput,
  StateStyleResult,
  StyleScope,
  Version,
  WrittenFile,
} from "./deps.js";
import { StateStyleError } from "./errors.js";

interface StateTarget {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface StateStyleRequest {
  readonly input: StateStyleInput;
  readonly target: StateTarget;
}

interface StateStylePlan {
  readonly classes: StateStyleResult["classes"];
  readonly input: StateStyleInput;
  readonly mode: StateStyleResult["mode"];
  readonly prefix: string;
  readonly title: string;
  readonly written: WrittenFile[];
}

interface StateStyleDone {
  readonly plan: StateStylePlan;
  readonly version: Version;
}

type EditStyle = NonNullable<DirectEditRequest["style"]>;

type Planned = Awaited<ReturnType<typeof planDirectEdit>>;

const SAME = "The layer already has this value in this state.";

const editRequest = (
  target: StateTarget,
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

const titleOf = (input: StateStyleInput, prefix: string): string => {
  const scope = prefix.slice(0, -1);

  if (input.reset) {
    return `State ${scope}: reset ${input.property}`;
  }

  return `State ${scope}: ${input.property} ${input.value ?? ""}`;
};

const classesOf = (planned: Planned): StateStyleResult["classes"] => {
  const delta = planned.patch.tailwind?.delta;

  if (planned.patch.tailwind?.mode !== "classes" || !delta) {
    return null;
  }

  return { add: delta.add, remove: delta.remove };
};

const modeOf = (planned: Planned): StateStyleResult["mode"] => {
  if (planned.patch.tailwind?.mode === "classes") {
    return "classes";
  }

  return "css";
};

const resolved = <Value>(
  result: { ok: true; value: Value } | { code: string; ok: false }
): Value => {
  if (!result.ok) {
    throw new StateStyleError(result.code);
  }

  return result.value;
};

const planStateStyle = async (
  scope: StyleScope,
  request: StateStyleRequest
): Promise<StateStylePlan> => {
  const site = await loadStyleSite(scope, request.target.source);
  const styleInput = request.input;

  const statePrefix = resolved(
    statePrefixOf(site.set.list, styleInput.state, styleInput.breakpoint)
  );

  const style = resolved(scopedStyleOf(styleInput)) as EditStyle;

  const planned = await planDirectEdit(
    scope.workTree,
    editRequest(request.target, style, statePrefix),
    null,
    { projectKind: scope.project.kind }
  );

  if (planned.patch.code === planned.original) {
    throw new StateStyleError(SAME);
  }

  return {
    classes: classesOf(planned),
    input: styleInput,
    mode: modeOf(planned),
    prefix: statePrefix,
    title: titleOf(styleInput, statePrefix),
    written: [
      {
        code: planned.patch.code,
        original: planned.original,
        target: planned.target,
      },
    ],
  };
};

const applyStateStyle = async (
  deps: DirectEditDeps,
  scope: StyleScope,
  request: StateStyleRequest
): Promise<StateStyleDone> => {
  guardScopedEdit(deps, scope);
  const plan = await planStateStyle(scope, request);

  const version = await commitScopedStyle(
    deps,
    scope,
    plan.written,
    plan.title
  );

  return { plan, version };
};

const toStateResult = (
  plan: StateStylePlan,
  version: Version | null
): StateStyleResult => ({
  breakpoint: plan.input.breakpoint,
  classes: plan.classes,
  files: plan.written.map((entry) => entry.target.relative),
  mode: plan.mode,
  prefix: plan.prefix,
  property: plan.input.property,
  state: plan.input.state,
  title: plan.title,
  value: plan.input.value,
  versionId: version?.id ?? null,
});

export { planStateStyle, applyStateStyle, toStateResult };

export type { StateStyleDone, StateStylePlan, StateStyleRequest, StateTarget };
