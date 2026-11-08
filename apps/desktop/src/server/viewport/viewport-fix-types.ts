import type { SourceLoc } from "@design-studio/contracts";

import type { FixFacts, FixKind } from "./engine/fix-rules.js";

interface FixCommand {
  readonly directionId: string | null;
  readonly isDryRun: boolean;
  readonly kinds: readonly FixKind[];
  readonly page: string;
  readonly projectId: string;
  readonly widths: readonly number[];
}

interface FixApplied {
  readonly after: string;
  readonly before: string;
  readonly kind: FixKind;
  readonly layerId: string;
  readonly width: number;
}

interface FixSkipped {
  readonly kind: FixKind;
  readonly layerId: string | null;
  readonly reason: string;
  readonly width: number;
}

interface FixCount {
  readonly clippedText: number;
  readonly horizontalScroll: number;
  readonly overflow: number;
  readonly tapTargets: number;
  readonly width: number;
}

interface FixResult {
  readonly after: readonly FixCount[];
  readonly applied: readonly FixApplied[];
  readonly before: readonly FixCount[];
  readonly skipped: readonly FixSkipped[];
  readonly versionId: string | null;
}

interface FixEdit {
  readonly add: readonly string[];
  readonly lines: readonly string[];
  readonly loc: SourceLoc;
  readonly tag: string;
}

interface FixPlan {
  readonly applied: readonly FixApplied[];
  readonly edits: readonly FixEdit[];
  readonly skipped: readonly FixSkipped[];
}

interface FixScrollerFacts {
  readonly facts: FixFacts;
  readonly loc: string;
}

interface FixPageFacts {
  readonly elements: Readonly<Record<string, FixFacts>>;
  readonly scrollers: readonly FixScrollerFacts[];
}

export type {
  FixApplied,
  FixCommand,
  FixCount,
  FixEdit,
  FixPageFacts,
  FixPlan,
  FixResult,
  FixScrollerFacts,
  FixSkipped,
};
