import path from "node:path";

import { parseDirectEditRequest, planDirectEdit } from "./deps.js";
import type { EffectItem } from "./deps.js";
import {
  fromSheetText,
  toEffectDeclarations,
  toLinkedHtml,
  toRuleText,
  toSheetWithRule,
  toSheetWithoutRule,
} from "./engine/index.js";
import { EffectError } from "./errors.js";
import type { ClassChange, EffectScope, EffectTarget } from "./set-plan.js";
import { getRule } from "./sheet.js";
import type { SheetFile, SheetRule } from "./sheet.js";
import type { EffectSite } from "./site.js";

const toSheetWithLayer = (
  sheet: SheetFile,
  rules: readonly SheetRule[],
  effects: readonly EffectItem[],
  className: string | null
): string => {
  if (className === null || getRule(rules, className) !== null) {
    return sheet.text;
  }

  return toSheetWithRule(
    sheet.text,
    null,
    toRuleText(
      className,
      { effects, name: null },
      toEffectDeclarations(effects)
    )
  );
};

const toLinkedCode = (
  site: EffectSite,
  sheet: SheetFile,
  code: string
): string => {
  const href = path.posix.relative(
    path.posix.dirname(site.relative),
    sheet.relative
  );

  if (!site.isHtml || (!sheet.isNew && code.includes(href))) {
    return code;
  }

  const linked = toLinkedHtml(code, href);

  if (linked === null) {
    throw new EffectError(
      "This page has no head tag, so the style sheet cannot be linked."
    );
  }

  return linked;
};

const toClassedCode = async (
  scope: EffectScope,
  target: EffectTarget,
  change: ClassChange,
  code: string
): Promise<string> => {
  if (change.add.length === 0 && change.remove.length === 0) {
    return code;
  }

  const base = {
    classes: change,
    selector: target.selector ?? "",
    source: target.source,
  };

  let request = parseDirectEditRequest(base);

  if (target.tag !== null) {
    request = parseDirectEditRequest({ ...base, tag: target.tag });
  }

  const planned = await planDirectEdit(scope.workTree, request, null, {
    projectKind: scope.project.kind,
  });

  return planned.patch.code;
};

const toPrunedSheet = (
  text: string,
  oldAnon: SheetRule | null,
  referenceCount: number
): string => {
  if (oldAnon === null || referenceCount > 0) {
    return text;
  }

  const rule =
    fromSheetText(text).find(
      (entry) => entry.className === oldAnon.className
    ) ?? null;

  if (rule === null) {
    return text;
  }

  return toSheetWithoutRule(text, rule);
};

export { toClassedCode, toLinkedCode, toPrunedSheet, toSheetWithLayer };
