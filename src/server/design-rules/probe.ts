import { RULES_PROBE } from "./probe.probe.js";

export interface ProbeRule {
  id: string;
  kind: "class" | "font" | "component";
  selector?: string;
  classes?: string[][];
  families?: string[];
  name?: string;
  tag?: string;
}

export interface RuleMiss {
  cls: string;
  prop: string | null;
  actual: string | null;
  expected: string | null;
}

export interface RuleHitElement {
  ruleId: string;
  selector: string;
  tag: string;
  text: string;
  loc: string | null;
  nearLoc: string | null;
  classes: string[];
  misses: RuleMiss[];
  family?: string;
}

export interface RulesProbeResult {
  hits: RuleHitElement[];
  scanned: Record<string, number>;
}

export function rulesProbeExpression(input: {
  rules: ProbeRule[];
  app: boolean;
}): string {
  return `(${RULES_PROBE})(${JSON.stringify(input)})`;
}
