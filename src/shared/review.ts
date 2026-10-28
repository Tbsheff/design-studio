import type { DirectEditRequest, Version } from './contracts.js';

export const REVIEW_KINDS = ['contrast', 'tap-target', 'alt-text', 'a11y', 'off-token', 'clipped'] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export type ReviewSeverity = 'high' | 'medium' | 'low';

export const REVIEW_KIND_LABEL: Record<ReviewKind, string> = {
  contrast: 'Color contrast',
  'tap-target': 'Tap target size',
  'alt-text': 'Missing alt text',
  a11y: 'Accessibility',
  'off-token': 'Off-token values',
  clipped: 'Clipped or overflowing',
};

export const REVIEW_FIX_MAX = 50;

export interface ReviewFrame {
  id?: string;
  label?: string;
  path?: string;
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
}

export interface ReviewRequest {
  frame?: string;
  path?: string;
  width?: number;
  height?: number;
}

export interface ReviewFixRequest {
  findingIds: string[];
}

export interface ReviewFixResult {
  applied: string[];
  skipped: { id: string; reason: string }[];
  files: string[];
  version: Version | null;
}
