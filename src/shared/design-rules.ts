export type DesignRuleKind = 'class' | 'token' | 'font' | 'component' | 'text';

interface RuleBase {
  id: string;
  text: string;
}

export interface ClassRule extends RuleBase {
  kind: 'class';
  target: string;
  selector: string;
  classes: string[][];
}

export interface TokenRule extends RuleBase {
  kind: 'token';
  scope: 'color' | 'any';
}

export interface FontRule extends RuleBase {
  kind: 'font';
  families: string[];
}

export interface ComponentRule extends RuleBase {
  kind: 'component';
  name: string;
  module: string | null;
  tag: string;
}

export interface TextRule extends RuleBase {
  kind: 'text';
}

export type DesignRule = ClassRule | TokenRule | FontRule | ComponentRule | TextRule;

export const DESIGN_RULE_KIND_LABEL: Record<DesignRuleKind, string> = {
  class: 'Classes',
  token: 'Tokens',
  font: 'Font',
  component: 'Component',
  text: 'Agent only',
};

export type DesignRulesOrigin = 'design-md' | 'studio' | 'app-docs' | 'none';

export interface DesignRulesState {
  text: string;
  rules: DesignRule[];
  origin: DesignRulesOrigin;
  file: string | null;
  editable: boolean;
  imported: string | null;
  importFrom: string[];
}

export interface DesignRuleHit {
  ruleId: string;
  count: number;
  samples: { element: string; source: string | null; message: string }[];
}

export interface DesignRulesTestResult {
  rules: DesignRule[];
  hits: DesignRuleHit[];
  frame: { path?: string; width: number; height: number };
  notes: string[];
}

export const DESIGN_RULES_MAX = 60;
export const DESIGN_RULES_TEXT_MAX = 20_000;
export const DESIGN_MD_RULES_START = '<!-- studio:rules:start -->';
export const DESIGN_MD_RULES_END = '<!-- studio:rules:end -->';
