import { parse } from "parse5";

import { DirectEditError } from "./errors.js";
import type { SourcePosition } from "./errors.js";
import { findElementAt } from "./html.js";
import { applySplices } from "./splice.js";
import { toChildRuleDeclarations, toChildRuleSplices } from "./variant-css.js";

const toChildRulePatch = (
  source: string,
  loc: SourcePosition,
  body: string,
  raw: string
): string => {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const element = findElementAt(document, loc);

  if (element === null) {
    throw new DirectEditError(
      "element_not_found",
      "No element starts at this source location"
    );
  }

  return applySplices(
    source,
    toChildRuleSplices({ document, element, raw, source }, body)
  );
};

const toChildRuleProps = (
  source: string,
  loc: SourcePosition,
  variant: string
): { prop: string; value: string }[] => {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const element = findElementAt(document, loc);

  if (element === null) {
    return [];
  }

  return toChildRuleDeclarations({ document, element, raw: variant });
};

export { toChildRulePatch, toChildRuleProps };
