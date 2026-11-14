import type { DirectEditRequest } from "@design-studio/contracts";

import { parseLoc } from "./checks.js";
import type { Draft } from "./checks.js";
import type { InteractionHit } from "./engine/index.js";
import { toInteractionProbeExpression } from "./interaction-probe.js";
import type { ProbeElement } from "./probe.js";

interface InteractionDraftInput {
  readonly elements: Readonly<Record<string, ProbeElement | null>>;
  readonly hits: readonly InteractionHit[];
  readonly isApp: boolean;
  readonly isTailwind: boolean;
}

const INTERACTION_CAP = 200;

const toInteractionExpression = (): string =>
  toInteractionProbeExpression(INTERACTION_CAP);

const toElementName = (el: ProbeElement | null, selector: string): string => {
  if (!el) {
    return selector;
  }

  if (el.text) {
    return `${el.tag} "${el.text}"`;
  }

  return el.tag;
};

const toHoverEdit = (
  hit: InteractionHit,
  el: ProbeElement | null,
  isTailwind: boolean
): DirectEditRequest | null => {
  const loc = parseLoc(el?.loc ?? null);

  if (!el || !loc || !isTailwind || !hit.fixClass) {
    return null;
  }

  return {
    classes: { add: [hit.fixClass], remove: [] },
    selector: el.selector,
    source: loc,
    tag: el.tag,
  };
};

const toInteractionDraft = (
  hit: InteractionHit,
  input: InteractionDraftInput
): Draft => {
  const el = input.elements[hit.selector] ?? null;
  const edit = toHoverEdit(hit, el, input.isTailwind);

  const draft: Draft = {
    element: toElementName(el, hit.selector),
    fix: null,
    hint: hit.hint,
    key: hit.key,
    kind: hit.kind,
    message: hit.message,
    selector: hit.selector,
    severity: hit.severity,
    source: el?.loc ?? el?.nearLoc ?? null,
  };

  if (edit && hit.fixClass) {
    draft.fix = { edit, label: `Add ${hit.fixClass}` };
  }

  if (input.isApp && el) {
    draft.guard = { classes: el.classes, noArbitrary: true };
  }

  return draft;
};

const toInteractionDrafts = (input: InteractionDraftInput): Draft[] =>
  input.hits.map((hit) => toInteractionDraft(hit, input));

export { toInteractionDrafts, toInteractionExpression };
