import type {
  DesignRule,
  DesignRuleHit,
  DesignRulesState,
  DesignRulesTestResult,
} from "@design-studio/contracts/design-rules";

import { pick } from "./pick.js";

type RuleTone = "bad" | "idle" | "ok";

const toOriginText = (state: DesignRulesState): string => {
  if (state.origin === "design-md") {
    return "Saved in the rules block of DESIGN.md. Save makes a version you can undo.";
  }

  if (state.origin === "studio") {
    return "Saved in the studio. The app repo does not change.";
  }

  if (state.origin === "app-docs") {
    return `Read from ${state.file ?? "the app docs"}. Save keeps your copy in the studio; the app repo does not change.`;
  }

  return "No rules yet. Write some, or import them from the project docs.";
};

const toHitText = (
  rule: DesignRule,
  hit: DesignRuleHit | undefined
): string => {
  if (rule.kind === "text" || !hit) {
    return "";
  }

  if (hit.count === 0) {
    return "Pass";
  }

  return `${hit.count} ${pick(hit.count === 1, "break", "breaks")}`;
};

const toSampleText = (hit: DesignRuleHit | undefined): string | null => {
  const sample = hit?.samples[0];

  if (!sample) {
    return null;
  }

  if (sample.source) {
    return `${sample.element} at ${sample.source}`;
  }

  return sample.element;
};

const toHitTip = (rule: DesignRule, hit: DesignRuleHit | undefined): string => {
  if (rule.kind === "text") {
    return `${rule.text}. The agent and the critic get this rule. Review cannot check it.`;
  }

  const sample = toSampleText(hit);

  if (sample === null) {
    return rule.text;
  }

  return `${rule.text}. First break: ${sample}`;
};

const toRuleTone = (
  rule: DesignRule,
  hit: DesignRuleHit | undefined
): RuleTone => {
  if (rule.kind === "text" || !hit) {
    return "idle";
  }

  return pick(hit.count === 0, "ok", "bad");
};

const toFrameText = (result: DesignRulesTestResult): string =>
  `Tested on ${result.frame.path ?? "the entry page"} at ${result.frame.width} px.`;

const toImportedText = (text: string, imported: string): string => {
  if (text.trim()) {
    return `${text.trimEnd()}\n\n${imported}`;
  }

  return imported;
};

const toPendingImport = (
  state: DesignRulesState | null,
  text: string
): string | null => {
  if (state?.imported && !text.includes(state.imported.trim())) {
    return state.imported;
  }

  return null;
};

const toHitMap = (
  result: DesignRulesTestResult | null
): Map<string, DesignRuleHit> => {
  const hits = new Map<string, DesignRuleHit>();

  for (const hit of result?.hits ?? []) {
    hits.set(hit.ruleId, hit);
  }

  return hits;
};

export {
  toFrameText,
  toHitMap,
  toHitText,
  toHitTip,
  toImportedText,
  toOriginText,
  toPendingImport,
  toRuleTone,
};
