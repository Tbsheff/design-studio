import path from "node:path";

import type { DirectEditRequest } from "@design-studio/contracts";

import {
  toCssRuleValue,
  toStyleBlockRuleValue,
} from "../engine/css-rule-value.js";
import type { RuleValueResult } from "../engine/css-rule-value.js";
import { DirectEditError } from "../engine/errors.js";
import type { PatchResult } from "../engine/errors.js";

const CSS_EXTENSION = ".css";

const HTML_EXTENSIONS = new Set([".html", ".htm"]);

const STYLE_TAG = "style";

const isCssRuleEdit = (
  relative: string,
  request: DirectEditRequest
): boolean => {
  const extension = path.extname(relative).toLowerCase();

  if (extension === CSS_EXTENSION) {
    return true;
  }

  return HTML_EXTENSIONS.has(extension) && request.tag === STYLE_TAG;
};

const toRuleStyle = (
  request: DirectEditRequest
): Record<string, string | null> =>
  Object.fromEntries(
    Object.entries(request.style ?? {}).map(([prop, value]) => [
      prop,
      value ?? null,
    ])
  );

const toRuleResult = (
  relative: string,
  source: string,
  request: DirectEditRequest
): RuleValueResult => {
  const style = toRuleStyle(request);

  if (path.extname(relative).toLowerCase() === CSS_EXTENSION) {
    return toCssRuleValue(source, request.selector, style);
  }

  return toStyleBlockRuleValue(source, request.selector, style);
};

const toCssRulePatch = (
  relative: string,
  source: string,
  request: DirectEditRequest
): PatchResult => {
  const result = toRuleResult(relative, source, request);

  if (!result.ok) {
    throw new DirectEditError(
      "element_not_found",
      `No CSS rule ${request.selector} with that property is in ${relative}.`
    );
  }

  return {
    applied: { style: Object.keys(request.style ?? {}), text: false },
    code: result.code,
    tag: STYLE_TAG,
  };
};

export { isCssRuleEdit, toCssRulePatch };
