import type {
  DirectEditRequest,
  DirectStyleProperty,
} from "@design-studio/contracts";

import { toAlignProbeExpression } from "./align-probe.js";
import { parseLoc } from "./checks.js";
import type { Draft } from "./checks.js";
import type { AlignFix, AlignHit } from "./engine/index.js";
import type { ProbeElement } from "./probe.js";

interface AlignDraftInput {
  readonly elements: Readonly<Record<string, ProbeElement | null>>;
  readonly hits: readonly AlignHit[];
  readonly isApp: boolean;
}

const toAlignSelectors = (hits: readonly AlignHit[]): string[] =>
  hits.flatMap((hit) => {
    if (hit.fix) {
      return [hit.selector, hit.fix.selector];
    }

    return [hit.selector];
  });

const toElementName = (el: ProbeElement | null, selector: string): string => {
  if (!el) {
    return selector;
  }

  if (el.text) {
    return `${el.tag} "${el.text}"`;
  }

  return el.tag;
};

const toMarginEdit = (
  fix: AlignFix,
  el: ProbeElement | null
): DirectEditRequest | null => {
  const loc = parseLoc(el?.loc ?? null);

  if (!el || !loc) {
    return null;
  }

  const marginStyle: Partial<Record<DirectStyleProperty, string>> =
    Object.fromEntries([[fix.prop, fix.value]]);

  return {
    selector: el.selector,
    source: loc,
    style: marginStyle,
    tag: el.tag,
  };
};

const toAlignDraft = (hit: AlignHit, input: AlignDraftInput): Draft => {
  const el = input.elements[hit.selector] ?? null;
  let target: ProbeElement | null = null;

  if (hit.fix) {
    target = input.elements[hit.fix.selector] ?? null;
  }

  const draft: Draft = {
    element: toElementName(el, hit.selector),
    fix: null,
    hint: hit.hint,
    key: hit.key,
    kind: "align",
    message: hit.message,
    selector: hit.selector,
    severity: hit.severity,
    source: el?.loc ?? el?.nearLoc ?? null,
  };

  if (hit.fix) {
    const edit = toMarginEdit(hit.fix, target);

    if (edit) {
      draft.fix = { edit, label: hit.fix.label };
    }
  }

  if (input.isApp && target) {
    draft.guard = { classes: target.classes, noArbitrary: true };
  }

  return draft;
};

const toAlignDrafts = (input: AlignDraftInput): Draft[] =>
  input.hits.map((hit) => toAlignDraft(hit, input));

const ALIGN_CAP = 400;

const toAlignExpression = (): string => toAlignProbeExpression(ALIGN_CAP);

export { toAlignDrafts, toAlignExpression, toAlignSelectors };
