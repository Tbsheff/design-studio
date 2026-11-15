import type {
  CompiledTokenEntry,
  DirectEditRequest,
  DirectStyleProperty,
  TokenGroupName,
} from "@design-studio/contracts";

import { lengthToPx, matchDimension } from "../../shared/token-match.js";
import { parseLoc } from "./checks.js";
import type { Draft } from "./checks.js";
import type { TypeFix, TypeHit, TypeStep } from "./engine/index.js";
import type { ProbeElement } from "./probe.js";
import { toTypeProbeExpression } from "./type-probe.js";

interface TypeDraftInput {
  readonly elements: Readonly<Record<string, ProbeElement | null>>;
  readonly hits: readonly TypeHit[];
  readonly isApp: boolean;
  readonly isTailwind: boolean;
}

const MAX_WIDTH_CLASS = /^max-w-/u;

const CLASS_PROPS = new Set(["max-width", "text-wrap", "white-space"]);

const TYPE_CAP = 800;

const toTypeExpression = (): string => toTypeProbeExpression(TYPE_CAP);

const toTypeSteps = (
  entries: CompiledTokenEntry[],
  group: TokenGroupName
): TypeStep[] =>
  matchDimension("0px", entries, group).flatMap((match) => {
    const px = lengthToPx(match.value);

    if (px === null || px <= 0) {
      return [];
    }

    return [{ cssVar: match.cssVar, px }];
  });

const toStyle = (
  style: Readonly<Record<string, string>>,
  isClassFix: boolean
): Partial<Record<DirectStyleProperty, string>> =>
  Object.fromEntries(
    Object.entries(style).filter(
      ([prop]) => !isClassFix || !CLASS_PROPS.has(prop)
    )
  );

const toEdit = (
  fix: TypeFix,
  el: ProbeElement,
  isTailwind: boolean
): DirectEditRequest | null => {
  const loc = parseLoc(el.loc);

  if (!loc) {
    return null;
  }

  const isClassFix =
    isTailwind && fix.tailwindClass !== null && el.classes.length > 0;

  const style = toStyle(fix.style, isClassFix);

  const edit: DirectEditRequest = {
    selector: el.selector,
    source: loc,
    tag: el.tag,
  };

  if (Object.keys(style).length > 0) {
    edit.style = style;
  }

  if (isClassFix && fix.tailwindClass) {
    edit.classes = {
      add: [fix.tailwindClass],
      remove: el.classes.filter(
        (cls) =>
          MAX_WIDTH_CLASS.test(cls) &&
          MAX_WIDTH_CLASS.test(fix.tailwindClass ?? "")
      ),
    };
  }

  return edit;
};

const toElementName = (el: ProbeElement | null, selector: string): string => {
  if (!el) {
    return selector;
  }

  if (el.text) {
    return `${el.tag} "${el.text}"`;
  }

  return el.tag;
};

const toTypeDraft = (hit: TypeHit, input: TypeDraftInput): Draft => {
  const el = input.elements[hit.selector] ?? null;
  let edit: DirectEditRequest | null = null;

  if (el && hit.fix) {
    edit = toEdit(hit.fix, el, input.isTailwind);
  }

  const draft: Draft = {
    element: toElementName(el, hit.selector),
    fix: null,
    hint: hit.hint,
    key: hit.selector,
    kind: "type",
    message: hit.message,
    selector: hit.selector,
    severity: hit.severity,
    source: el?.loc ?? el?.nearLoc ?? null,
  };

  if (edit && hit.fix) {
    draft.fix = { edit, label: hit.fix.label };
  }

  if (input.isApp && el) {
    draft.guard = { classes: el.classes, noArbitrary: true };
  }

  return draft;
};

const toTypeDrafts = (input: TypeDraftInput): Draft[] =>
  input.hits.map((hit) => toTypeDraft(hit, input));

export { toTypeDrafts, toTypeExpression, toTypeSteps };
