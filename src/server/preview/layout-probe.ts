import { devChromeExpression } from "../../shared/app.js";
import type { LayoutFinding } from "../../shared/contracts.js";
import { LAYOUT_PROBE_SOURCE } from "./layout-probe.probe.js";

const MAX_LAYOUT_FINDINGS = 10;

export interface LayoutProbeResult {
  findings: LayoutFinding[];
  total: number;
}

export function layoutProbeExpression(cap = MAX_LAYOUT_FINDINGS): string {
  return `(${LAYOUT_PROBE_SOURCE})(${Number(cap)}, ${devChromeExpression()})`;
}
