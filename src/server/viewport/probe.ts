import type { LayoutFinding } from "../../shared/contracts.js";
import { layoutProbeExpression, SOURCE_LOC_ATTR } from "./deps.js";
import { EXTRA_SOURCE } from "./probe.probe.js";

interface RawTap {
  readonly detail: string;
  readonly selector: string;
  readonly source: string | null;
}

interface RawMatrixProbe {
  readonly layout: {
    readonly findings: readonly LayoutFinding[];
    readonly total: number;
  };
  readonly scroll: { readonly scrollWidth: number; readonly width: number };
  readonly taps: { readonly items: readonly RawTap[]; readonly total: number };
}

const LAYOUT_CAP = 20;

const TAP_CAP = 20;

const matrixProbe = (checkTaps: boolean): string =>
  `(() => { const layout = ${layoutProbeExpression(LAYOUT_CAP)}; const extra = (${EXTRA_SOURCE})(${String(checkTaps)}, ${TAP_CAP}, ${JSON.stringify(SOURCE_LOC_ATTR)}); return { layout, taps: extra.taps, scroll: extra.scroll }; })()`;

export { matrixProbe };

export type { RawMatrixProbe, RawTap };
