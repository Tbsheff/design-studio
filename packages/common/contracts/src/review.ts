import type { DirectEditRequest, Version } from "@design-studio/contracts";

export const REVIEW_KINDS = [
  "contrast",
  "tap-target",
  "alt-text",
  "a11y",
  "off-token",
  "clipped",
  "rule",
] as const;

export type ReviewKind = (typeof REVIEW_KINDS)[number];

export type ReviewSeverity = "high" | "medium" | "low";

export const REVIEW_KIND_LABEL: Record<ReviewKind, string> = {
  a11y: "Accessibility",
  "alt-text": "Missing alt text",
  clipped: "Clipped or overflowing",
  contrast: "Color contrast",
  "off-token": "Off-token values",
  rule: "Design rules",
  "tap-target": "Tap target size",
};

export const REVIEW_FIX_MAX = 50;

export interface ReviewFrame {
  id?: string;
  label?: string;
  path?: string;
  selector?: string;
  width: number;
  height: number;
}

export interface ReviewFix {
  label: string;
  edit: DirectEditRequest;
}

export interface ReviewFinding {
  id: string;
  kind: ReviewKind;
  severity: ReviewSeverity;
  selector: string | null;
  source: string | null;
  element: string;
  message: string;
  fix: ReviewFix | null;
  ask: string;
  copies?: number;
  shared?: string;
  rule?: { id: string; text: string };
}

export interface ReviewResult {
  projectId: string;
  directionId: string;
  frame: ReviewFrame;
  versionId: string | null;
  ranAt: number;
  findings: ReviewFinding[];
  counts: Record<ReviewSeverity, number>;
  notes: string[];
  matched?: { count: number; note: string };
}

export interface ReviewRequest {
  frame?: string;
  path?: string;
  selector?: string;
  width?: number;
  height?: number;
}

export interface ReviewFixRequest {
  findingIds: string[];
  allowShared?: boolean;
}

export interface ReviewFixResult {
  applied: string[];
  skipped: { id: string; reason: string }[];
  files: string[];
  version: Version | null;
  shared?: string[];
}
