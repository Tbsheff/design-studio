import { PROBE_SOURCE } from "./probe.probe.js";

export interface ProbeElement {
  selector: string;
  tag: string;
  text: string;
  loc: string | null;
  nearLoc: string | null;
  classes: string[];
  display: string;
  width: number;
  height: number;
  padding: [number, number, number, number];
  tapStyle?: Record<string, string> | null;
}

export interface TokenHit {
  via: "class" | "inline" | "rule";
  selector: string;
  prop: string;
  value: string;
  cls?: string;
  variants?: string;
  rule?: string;
}

export interface ProbeResult {
  elements: Record<string, ProbeElement | null>;
  tokens: TokenHit[];
  tokenElements: Record<string, ProbeElement>;
  taps: ProbeElement[];
}

export interface ProbeInput {
  selectors: string[];
  app: boolean;
  scanRules: boolean;
  cap: number;
}

export function reviewProbeExpression(input: ProbeInput): string {
  return `(${PROBE_SOURCE})(${JSON.stringify(input)})`;
}
