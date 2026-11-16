import { REVIEW_KINDS } from "@design-studio/contracts/review";
import type {
  ReviewFinding,
  ReviewKind,
  ReviewSeverity,
} from "@design-studio/contracts/review";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

interface ReviewActions {
  readonly fixBlocked: string | null;
  readonly fixing: string[] | null;
  readonly canAsk: boolean;
  readonly onSelect: (finding: ReviewFinding) => void;
  readonly onAsk: (finding: ReviewFinding) => void;
  readonly onFix: (findings: ReviewFinding[]) => void;
}

type ReviewGroup = readonly [ReviewKind, ReviewFinding[]];

const SEVERITY_WORD = new Map<ReviewSeverity, string>([
  ["high", copy.high],
  ["low", copy.low],
  ["medium", copy.medium],
]);

const toFixBlocked = (isLive: boolean, isRunning: boolean): string | null => {
  if (!isLive) {
    return copy.fixesLiveOnly;
  }

  return pick(isRunning, copy.runIsEditing, null);
};

const toGroups = (findings: readonly ReviewFinding[]): ReviewGroup[] => {
  const groups: ReviewGroup[] = [];

  for (const kind of REVIEW_KINDS) {
    const list = findings.filter((finding) => finding.kind === kind);

    if (list.length > 0) {
      groups.push([kind, list]);
    }
  }

  return groups;
};

const toFixTip = (finding: ReviewFinding): string => {
  if (finding.shared) {
    return `${copy.sharedFixTip} ${finding.shared}, ${copy.sharedFixTipEnd}`;
  }

  return copy.applyFixTip;
};

export { SEVERITY_WORD, toFixBlocked, toFixTip, toGroups };

export type { ReviewActions, ReviewGroup };
