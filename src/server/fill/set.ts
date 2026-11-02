import { planClasses } from "./classes.js";
import type { ClassChanges } from "./classes.js";
import { commitAll, guardEdit } from "./commit.js";
import type { FillEditScope } from "./commit.js";
import { gradientCss } from "./css.js";
import { parseDirectEditRequest, planDirectEdit } from "./deps.js";
import type {
  DirectEditDeps,
  DirectEditRequest,
  FillBlend,
  FillSpec,
  SourceLoc,
  Version,
  WrittenFile,
} from "./deps.js";
import { FillError } from "./errors.js";
import { loadFillSite } from "./site.js";
import type { FillScope, FillSite } from "./site.js";
import { specOf } from "./spec.js";
import type { FillInput } from "./spec.js";

interface FillTarget {
  selector?: string | undefined;
  source: SourceLoc;
  tag?: string | undefined;
}

interface FillSetRequest {
  input: FillInput;
  target: FillTarget;
}

interface FillSetPlan {
  blend: FillBlend | null;
  classes: ClassChanges | null;
  fill: FillSpec;
  mode: "classes" | "css";
  title: string;
  written: WrittenFile[];
}

interface FillSetDone {
  plan: FillSetPlan;
  version: Version;
}

type FillStyle = NonNullable<DirectEditRequest["style"]>;

const STYLE_VALUE_MAX = 200;

const fillStyle = (fill: FillSpec): FillStyle => {
  if (fill.type === "solid") {
    return { "background-color": fill.paint.color, "background-image": null };
  }

  const css = gradientCss(fill) ?? "";

  if (css.length > STYLE_VALUE_MAX) {
    throw new FillError(
      "This gradient is too long for one style value. Use fewer stops or color tokens."
    );
  }

  return { "background-color": null, "background-image": css };
};

const styleOf = (fill: FillSpec, blend: FillBlend | null): FillStyle => {
  const style = fillStyle(fill);

  if (blend) {
    return { ...style, [blend.property]: blend.mode } as FillStyle;
  }

  return style;
};

const classesOf = (
  site: FillSite,
  fill: FillSpec,
  blend: FillBlend | null
): ClassChanges | null => {
  if (site.mode !== "classes" || !site.theme) {
    return null;
  }

  return planClasses(site.classes, fill, blend, site.theme);
};

const editRequest = (
  target: FillTarget,
  classes: ClassChanges | null,
  fill: FillSpec,
  blend: FillBlend | null
): DirectEditRequest => {
  const base = {
    selector: target.selector ?? "",
    source: target.source,
    tag: target.tag,
  };

  if (classes) {
    return parseDirectEditRequest({ ...base, classes });
  }

  return parseDirectEditRequest({ ...base, style: styleOf(fill, blend) });
};

const kindText = (fill: FillSpec): string => {
  if (fill.type === "solid") {
    return "solid";
  }

  return `${fill.type} gradient`;
};

const titleOf = (fill: FillSpec, blend: FillBlend | null): string => {
  if (blend) {
    return `Fill: ${kindText(fill)}, ${blend.mode} blend`;
  }

  return `Fill: ${kindText(fill)}`;
};

const unchanged = (classes: ClassChanges | null): boolean =>
  classes !== null && classes.add.length === 0 && classes.remove.length === 0;

const SAME = "The element already has this fill.";

const planFillSet = async (
  scope: FillScope,
  request: FillSetRequest
): Promise<FillSetPlan> => {
  const site = await loadFillSite(scope, request.target.source);

  const { blend, fill } = specOf(
    {
      entries: site.entries,
      themeNames: site.theme?.colorNames ?? new Set<string>(),
    },
    request.input
  );

  const classes = classesOf(site, fill, blend);

  if (unchanged(classes)) {
    throw new FillError(SAME);
  }

  const planned = await planDirectEdit(
    scope.workTree,
    editRequest(request.target, classes, fill, blend),
    null,
    { projectKind: scope.project.kind }
  );

  if (planned.patch.code === planned.original) {
    throw new FillError(SAME);
  }

  return {
    blend,
    classes,
    fill,
    mode: site.mode,
    title: titleOf(fill, blend),
    written: [
      {
        code: planned.patch.code,
        original: planned.original,
        target: planned.target,
      },
    ],
  };
};

const setFill = async (
  deps: DirectEditDeps,
  scope: FillEditScope,
  request: FillSetRequest
): Promise<FillSetDone> => {
  guardEdit(deps, scope);
  const plan = await planFillSet(scope, request);
  const version = await commitAll(deps, scope, plan.written, plan.title);

  return { plan, version };
};

export { planFillSet, setFill };

export type { FillSetDone, FillSetPlan, FillSetRequest, FillTarget };
