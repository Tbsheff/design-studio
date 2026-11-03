import type { NavSummary } from "../../shared/contracts.js";
import {
  PLACEHOLDER_PATTERN,
  QUALITY_PROBE_SOURCE,
} from "./quality-probe.probe.js";

export interface ProbeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TapHit {
  selector: string;
  source: string | null;
  text: string;
  width: number;
  height: number;
}

export interface PlaceholderHit {
  selector: string;
  source: string | null;
  text: string;
  match: string;
  optedOut: boolean;
}

export interface GenericHit {
  pattern: "plan-cards" | "hero-feature-cards" | "all-centered";
  detail: string;
  selector: string | null;
  source: string | null;
}

export interface DuplicateHit {
  kind: "price" | "cta";
  text: string;
  count: number;
  selectors: string[];
  sources: (string | null)[];
}

interface QualityProbeOptions {
  tapTargets: boolean;
  placeholder: boolean;
  layout?: boolean;
  duplicates?: boolean;
  selectionLocs: string[];
  cap: number;
}

export interface QualityProbeResult {
  tap: TapHit[];
  tapTotal: number;
  placeholder: PlaceholderHit[];
  placeholderTotal: number;
  generic?: GenericHit[];
  duplicates?: DuplicateHit[];
  nav: NavSummary;
  selectionRects: ProbeRect[];
  pageHeight: number;
}

export function qualityProbeExpression(options: QualityProbeOptions): string {
  return `(${QUALITY_PROBE_SOURCE})(${JSON.stringify({ ...options, pattern: PLACEHOLDER_PATTERN })})`;
}
