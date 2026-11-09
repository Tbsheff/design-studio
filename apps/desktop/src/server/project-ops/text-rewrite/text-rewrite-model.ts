import type { TEXT_REWRITE_MODES } from "@design-studio/actions/text/schema";

type RewriteMode = (typeof TEXT_REWRITE_MODES)[number];

interface RewriteLayer {
  readonly column: number;
  readonly file: string;
  readonly line: number;
}

interface RewriteContext {
  readonly designMd: string | null;
  readonly voice: string | null;
}

interface RewriteRequest {
  readonly language: string | null;
  readonly mode: RewriteMode;
  readonly text: string;
}

interface RewriteOptions {
  readonly model: string;
  readonly options: readonly string[];
}

interface RunCommand {
  readonly directionId: string;
  readonly language: string | null;
  readonly layer: RewriteLayer;
  readonly mode: RewriteMode;
  readonly projectId: string;
  readonly shouldApply: boolean;
}

interface RewriteResult {
  readonly isApplied: boolean;
  readonly layerText: string;
  readonly mode: RewriteMode;
  readonly model: string;
  readonly options: readonly string[];
  readonly versionId: string | null;
}

export type {
  RewriteContext,
  RewriteLayer,
  RewriteMode,
  RewriteOptions,
  RewriteRequest,
  RewriteResult,
  RunCommand,
};
