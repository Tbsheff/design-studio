type Severity = "high" | "low" | "medium";

interface CritiqueScores {
  readonly color: number;
  readonly copy: number;
  readonly hierarchy: number;
  readonly spacing: number;
  readonly type: number;
}

interface ModelIssue {
  readonly fix: string;
  readonly layerId?: string | null;
  readonly message: string;
  readonly severity: Severity;
}

interface ModelReply {
  readonly issues: readonly ModelIssue[];
  readonly scores: CritiqueScores;
}

interface CritiqueDraftIssue {
  readonly fix: string;
  readonly layerId: string | null;
  readonly message: string;
  readonly severity: Severity;
}

interface CritiqueDraft {
  readonly issues: readonly CritiqueDraftIssue[];
  readonly scores: CritiqueScores;
}

const MAX_ISSUES = 12;

const MAX_TEXT = 400;

const MAX_SCORE = 10;

const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  high: 0,
  low: 2,
  medium: 1,
};

const toScore = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_SCORE, Math.max(0, Math.round(value)));
};

const toScores = (scores: CritiqueScores): CritiqueScores => ({
  color: toScore(scores.color),
  copy: toScore(scores.copy),
  hierarchy: toScore(scores.hierarchy),
  spacing: toScore(scores.spacing),
  type: toScore(scores.type),
});

const toLayerId = (
  layerId: string | null,
  refs: ReadonlySet<string>
): string | null => {
  if (layerId !== null && refs.has(layerId)) {
    return layerId;
  }

  return null;
};

const toDraftIssue = (
  issue: ModelIssue,
  refs: ReadonlySet<string>
): CritiqueDraftIssue[] => {
  const message = issue.message.trim().slice(0, MAX_TEXT);
  const fix = issue.fix.trim().slice(0, MAX_TEXT);

  if (message === "" || fix === "") {
    return [];
  }

  const layerId = toLayerId(issue.layerId ?? null, refs);
  const { severity } = issue;

  return [{ fix, layerId, message, severity }];
};

const toCritiqueDraft = (
  reply: ModelReply,
  refs: ReadonlySet<string>
): CritiqueDraft => {
  const issues = reply.issues
    .flatMap((issue) => toDraftIssue(issue, refs))
    .toSorted(
      (left, right) =>
        SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]
    )
    .slice(0, MAX_ISSUES);

  return { issues, scores: toScores(reply.scores) };
};

export { MAX_ISSUES, toCritiqueDraft };

export type {
  CritiqueDraft,
  CritiqueDraftIssue,
  CritiqueScores,
  ModelIssue,
  ModelReply,
  Severity,
};
