import { readFile } from "node:fs/promises";

import { planClassChanges } from "./classes.js";
import type { ClassChanges } from "./classes.js";
import { commitOne, guardEdit } from "./commit.js";
import type { TextStyleEditScope } from "./commit.js";
import {
  elementClassInfo,
  parseDirectEditRequest,
  planDirectEdit,
  resolveSource,
  themeForFile,
} from "./deps.js";
import type {
  DirectEditDeps,
  DirectEditRequest,
  Project,
  SourceLoc,
  TailwindTheme,
  TextStyle,
  TextStyleProp,
  Version,
  WrittenFile,
} from "./deps.js";
import { findTextStyle, TextStyleError } from "./list.js";
import { propValue, setProps } from "./style.js";

interface TextStyleTarget {
  selector?: string | undefined;
  source: SourceLoc;
  tag?: string | undefined;
}

interface TextStyleApplyRequest {
  style: string;
  target: TextStyleTarget;
}

interface TextStylePlanScope {
  project: Project;
  workTree: string;
}

interface TextStyleApplyPlan {
  classes: ClassChanges | null;
  mode: "classes" | "css";
  style: TextStyle;
  title: string;
  written: WrittenFile;
}

interface TextStyleApplyDone {
  plan: TextStyleApplyPlan;
  version: Version;
}

const CSS_PROP = {
  family: "font-family",
  letterSpacing: "letter-spacing",
  lineHeight: "line-height",
  size: "font-size",
  weight: "font-weight",
} as const satisfies Record<TextStyleProp, string>;

type CssTextProp = (typeof CSS_PROP)[TextStyleProp];

type CssTextStyle = Partial<Record<CssTextProp, string>>;

const toCssStyleOf = (style: TextStyle): CssTextStyle => {
  const out: CssTextStyle = {};

  for (const prop of setProps(style)) {
    const value = propValue(style, prop);

    if (value !== null) {
      out[CSS_PROP[prop]] = value;
    }
  }

  return out;
};

const toThemeOf = async (
  scope: TextStylePlanScope,
  loc: SourceLoc
): Promise<TailwindTheme | null> => {
  const resolved = await resolveSource(scope.workTree, loc.file);
  const text = await readFile(resolved.file, "utf-8");

  return themeForFile(scope.workTree, resolved.relative, text, {
    projectKind: scope.project.kind,
  });
};

const toTailwindChanges = async (
  scope: TextStylePlanScope,
  style: TextStyle,
  loc: SourceLoc
): Promise<ClassChanges | null> => {
  const info = await elementClassInfo(scope.workTree, scope.project.kind, loc);

  if (info.tailwind?.mode !== "classes") {
    return null;
  }

  const theme = await toThemeOf(scope, loc);

  if (!theme) {
    return null;
  }

  return planClassChanges(style, info.tailwind.classes, theme);
};

const toEditRequest = (
  target: TextStyleTarget,
  style: TextStyle,
  classes: ClassChanges | null
): DirectEditRequest => {
  const base = {
    selector: target.selector ?? "",
    source: target.source,
    tag: target.tag,
  };

  if (classes) {
    return parseDirectEditRequest({ ...base, classes });
  }

  return parseDirectEditRequest({ ...base, style: toCssStyleOf(style) });
};

const toAlreadyUsed = (style: TextStyle): TextStyleError =>
  new TextStyleError(`The element already uses text style ${style.name}.`);

const isEmptyChange = (classes: ClassChanges | null): boolean =>
  classes !== null && classes.add.length === 0 && classes.remove.length === 0;

const toModeOf = (classes: ClassChanges | null): "classes" | "css" => {
  if (classes) {
    return "classes";
  }

  return "css";
};

const toPlanTextStyleApply = async (
  scope: TextStylePlanScope,
  request: TextStyleApplyRequest
): Promise<TextStyleApplyPlan> => {
  const found = await findTextStyle(scope.workTree, request.style);
  const classes = await toTailwindChanges(scope, found, request.target.source);

  if (isEmptyChange(classes)) {
    throw toAlreadyUsed(found);
  }

  const planned = await planDirectEdit(
    scope.workTree,
    toEditRequest(request.target, found, classes),
    null,
    { projectKind: scope.project.kind }
  );

  return {
    classes,
    mode: toModeOf(classes),
    style: found,
    title: `Text style ${found.name}`,
    written: {
      code: planned.patch.code,
      original: planned.original,
      target: planned.target,
    },
  };
};

const applyTextStyleEdit = async (
  deps: DirectEditDeps,
  scope: TextStyleEditScope,
  request: TextStyleApplyRequest
): Promise<TextStyleApplyDone> => {
  guardEdit(deps, scope);
  const plan = await toPlanTextStyleApply(scope, request);

  if (plan.written.code === plan.written.original) {
    throw toAlreadyUsed(plan.style);
  }

  const version = await commitOne(deps, scope, plan.written, plan.title);

  return { plan, version };
};

export { applyTextStyleEdit, toPlanTextStyleApply as planTextStyleApply };

export type {
  TextStyleApplyDone,
  TextStyleApplyPlan,
  TextStyleApplyRequest,
  TextStylePlanScope,
  TextStyleTarget,
};
