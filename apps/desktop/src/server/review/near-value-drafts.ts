import type { DirectStyleProperty } from "@design-studio/contracts";
import { DIRECT_STYLE_PROPERTIES } from "@design-studio/contracts";

import type { RenderPage } from "../../shared/server-ports.js";
import { parseLoc } from "./checks.js";
import type { Draft } from "./checks.js";
import { toNearValueHits } from "./engine/index.js";
import type { NearFamily, NearValueHit, NearValueUse } from "./engine/index.js";
import { toRuleFix, toRuleOrigins } from "./near-value-rule-fix.js";
import type { RuleOrigin } from "./near-value-rule-fix.js";
import type { ProbeElement, ProbeResult, TokenHit } from "./probe.js";

interface NearValueDraftInput {
  readonly hasTokens: boolean;
  readonly probe: ProbeResult;
}

const RADIUS_WINDOW = 2;

const BACKGROUND: NearFamily = "background-color";

const FAMILY = new Map<string, NearFamily>([
  ["background", BACKGROUND],
  [BACKGROUND, BACKGROUND],
  ["border-color", "border-color"],
  ["border-radius", "border-radius"],
  ["color", "color"],
]);

const toFamily = (hit: TokenHit): NearFamily | null =>
  FAMILY.get(hit.prop) ?? null;

const isInProject = (el: ProbeElement | null): boolean => {
  const loc = el?.loc ?? el?.nearLoc ?? null;

  return loc !== null && !loc.includes("node_modules/");
};

const toRuleCountExpression = (rules: readonly string[]): string =>
  `(() => ${JSON.stringify(rules)}.map((rule) => { try { return Math.max(1, document.querySelectorAll(rule).length); } catch { return 1; } }))()`;

const toRuleCounts = async (
  page: RenderPage,
  hits: readonly TokenHit[]
): Promise<Map<string, number>> => {
  const rules = [
    ...new Set(
      hits.flatMap((hit) => {
        if (hit.via === "rule" && hit.rule) {
          return [hit.rule];
        }

        return [];
      })
    ),
  ];

  if (rules.length === 0) {
    return new Map();
  }

  const counts = await page.evaluate<number[]>(toRuleCountExpression(rules));

  return new Map(rules.map((rule, index) => [rule, counts[index] ?? 1]));
};

const toUses = (
  hits: readonly TokenHit[],
  probe: ProbeResult,
  counts: ReadonlyMap<string, number>
): NearValueUse[] =>
  hits.flatMap((hit, index) => {
    const nearFamily = toFamily(hit);
    const el = probe.tokenElements[hit.selector] ?? null;

    if (nearFamily === null || el === null) {
      return [];
    }

    let useCount = 1;

    if (hit.via === "rule") {
      useCount = counts.get(hit.rule ?? "") ?? 1;
    }

    return [
      {
        family: nearFamily,
        id: index,
        tag: el.tag,
        uses: useCount,
        value: hit.value,
      },
    ];
  });

const toLabel = (el: ProbeElement): string => {
  if (el.text) {
    return `${el.tag} "${el.text}"`;
  }

  return el.tag;
};

const toStyleFamily = (hit: TokenHit): DirectStyleProperty | null => {
  const family = toFamily(hit);

  if (family === null || hit.prop !== family) {
    return null;
  }

  return DIRECT_STYLE_PROPERTIES.find((prop) => prop === family) ?? null;
};

const toFix = (
  hit: TokenHit,
  el: ProbeElement,
  target: string,
  origins: ReadonlyMap<string, RuleOrigin>
): Draft["fix"] => {
  const family = toStyleFamily(hit);
  const loc = parseLoc(el.loc);

  if (family === null) {
    return null;
  }

  if (hit.via === "rule") {
    return toRuleFix({ el, family, hit, origins, target });
  }

  if (hit.via !== "inline" || loc === null) {
    return null;
  }

  const changes: Partial<Record<DirectStyleProperty, string>> = {
    [family]: target,
  };

  return {
    edit: { selector: el.selector, source: loc, style: changes, tag: el.tag },
    label: `Use ${target}`,
  };
};

const toHint = (hit: TokenHit, near: NearValueHit): string => {
  const change = `Change ${hit.prop}: ${near.value} to ${near.target}`;

  if (hit.via === "rule" && hit.rule?.includes(",")) {
    return `${change} in the CSS rule ${hit.rule}. Other selectors share this rule, so check each of them first.`;
  }

  if (hit.via === "rule") {
    return `${change} in the CSS rule ${hit.rule ?? ""}.`;
  }

  return `${change} in the inline style.`;
};

const toGuardLiteral = (hit: TokenHit): string => {
  if (hit.via === "rule") {
    return "";
  }

  return hit.value;
};

const toDraft = (
  hit: TokenHit,
  el: ProbeElement,
  near: NearValueHit,
  origins: ReadonlyMap<string, RuleOrigin>
): Draft => {
  const draft: Draft = {
    element: toLabel(el),
    fix: toFix(hit, el, near.target, origins),
    hint: toHint(hit, near),
    key: `${hit.selector}|${hit.via}|${hit.prop}|${hit.value}|${hit.rule ?? ""}`,
    kind: "near-value",
    message: near.message,
    selector: hit.selector,
    severity: "low",
    source: el.loc ?? el.nearLoc ?? null,
  };

  if (draft.fix !== null) {
    draft.guard = {
      classes: el.classes,
      literal: toGuardLiteral(hit),
      noArbitrary: false,
    };
  }

  return draft;
};

const toNearValueDrafts = async (
  page: RenderPage,
  input: NearValueDraftInput
): Promise<Draft[]> => {
  if (input.hasTokens) {
    return [];
  }

  const hits = input.probe.tokens.filter(
    (hit) =>
      hit.via !== "class" &&
      isInProject(input.probe.tokenElements[hit.selector] ?? null)
  );

  const [counts, origins] = await Promise.all([
    toRuleCounts(page, hits),
    toRuleOrigins(page, hits),
  ]);

  const near = toNearValueHits({
    radiusWindow: RADIUS_WINDOW,
    uses: toUses(hits, input.probe, counts),
  });

  return near.flatMap((found) => {
    const hit = hits[found.id] ?? null;
    const el = input.probe.tokenElements[hit?.selector ?? ""] ?? null;

    if (hit === null || el === null) {
      return [];
    }

    return [toDraft(hit, el, found, origins)];
  });
};

export { toNearValueDrafts };
