import { commitSpacing, guardSpacingEdit } from "./commit.js";
import type { SpacingScope } from "./commit.js";
import { parseDirectEditRequest, planDirectEdit } from "./deps.js";
import type {
  DirectEditDeps,
  DirectEditRequest,
  SourceLoc,
  SpacingInput,
  SpacingSetResult,
  Version,
  WrittenFile,
} from "./deps.js";
import { SpacingError } from "./errors.js";
import { stylePropsOf } from "./props.js";
import { loadSpacingSite } from "./site.js";
import { spacingCssOf } from "./value.js";

interface SpacingTarget {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface SpacingSetRequest {
  readonly input: SpacingInput;
  readonly target: SpacingTarget;
}

interface SpacingSetPlan {
  readonly classes: SpacingSetResult["classes"];
  readonly mode: "classes" | "css";
  readonly style: Readonly<Record<string, string>>;
  readonly title: string;
  readonly token: string | null;
  readonly written: WrittenFile[];
}

interface SpacingSetDone {
  readonly plan: SpacingSetPlan;
  readonly version: Version;
}

type SpacingStyle = NonNullable<DirectEditRequest["style"]>;

const SAME = "The element already has this spacing.";

const toStyleOf = (props: readonly string[], css: string): SpacingStyle =>
  Object.fromEntries(props.map((prop) => [prop, css])) as SpacingStyle;

const toEditRequest = (
  target: SpacingTarget,
  style: SpacingStyle
): DirectEditRequest => {
  const base = {
    selector: target.selector ?? "",
    source: target.source,
    style,
  };

  if (target.tag) {
    return parseDirectEditRequest({ ...base, tag: target.tag });
  }

  return parseDirectEditRequest(base);
};

const toSideText = (input: SpacingInput): string => {
  if (input.side === "all") {
    return "";
  }

  return ` ${input.side}`;
};

const toTitleOf = (
  input: SpacingInput,
  css: string,
  token: string | null
): string => `Spacing: ${input.property}${toSideText(input)} ${token ?? css}`;

const toClassesOf = (
  planned: Awaited<ReturnType<typeof planDirectEdit>>
): SpacingSetResult["classes"] => {
  const delta = planned.patch.tailwind?.delta;

  if (planned.patch.tailwind?.mode !== "classes" || !delta) {
    return null;
  }

  return { add: delta.add, remove: delta.remove };
};

const toPlanSpacingSet = async (
  scope: SpacingScope,
  request: SpacingSetRequest
): Promise<SpacingSetPlan> => {
  const site = await loadSpacingSite(scope, request.target.source);
  const props = stylePropsOf(request.input.property, request.input.side);
  const { css, token } = spacingCssOf(site, request.input);
  const style = toStyleOf(props, css);

  const planned = await planDirectEdit(
    scope.workTree,
    toEditRequest(request.target, style),
    null,
    { projectKind: scope.project.kind }
  );

  if (planned.patch.code === planned.original) {
    throw new SpacingError(SAME);
  }

  return {
    classes: toClassesOf(planned),
    mode: site.mode,
    style: Object.fromEntries(props.map((prop) => [prop, css])),
    title: toTitleOf(request.input, css, token),
    token: token ?? null,
    written: [
      {
        code: planned.patch.code,
        original: planned.original,
        target: planned.target,
      },
    ],
  };
};

const applySpacing = async (
  deps: DirectEditDeps,
  scope: SpacingScope,
  request: SpacingSetRequest
): Promise<SpacingSetDone> => {
  guardSpacingEdit(deps, scope);
  const plan = await toPlanSpacingSet(scope, request);
  const version = await commitSpacing(deps, scope, plan.written, plan.title);

  return { plan, version };
};

const toSpacingResult = (
  plan: SpacingSetPlan,
  version: Version | null
): SpacingSetResult => ({
  classes: plan.classes,
  files: plan.written.map((entry) => entry.target.relative),
  mode: plan.mode,
  style: plan.style,
  title: plan.title,
  token: plan.token,
  versionId: version?.id ?? null,
});

export { toPlanSpacingSet as planSpacingSet, applySpacing, toSpacingResult };

export type {
  SpacingSetDone,
  SpacingSetPlan,
  SpacingSetRequest,
  SpacingTarget,
};
