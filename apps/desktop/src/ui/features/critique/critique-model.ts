import { copy } from "./copy.js";
import type { RouteOutput, critiqueRoutes } from "./deps.js";

type CritiqueView = RouteOutput<typeof critiqueRoutes.runCritique>;

type IssueView = CritiqueView["issues"][number];

type ScoreKey = keyof CritiqueView["scores"];

interface ScoreRow {
  readonly key: ScoreKey;
  readonly label: string;
  readonly value: number;
}

const SCORE_LABELS: Readonly<Record<ScoreKey, string>> = {
  color: "Color",
  copy: "Copy",
  hierarchy: "Hierarchy",
  spacing: "Spacing",
  type: "Type",
};

const SCORE_KEYS: readonly ScoreKey[] = [
  "hierarchy",
  "spacing",
  "type",
  "color",
  "copy",
];

const toScoreRows = (scores: CritiqueView["scores"]): ScoreRow[] =>
  SCORE_KEYS.map((key) => ({
    key,
    label: SCORE_LABELS[key],
    value: scores[key],
  }));

const toRunLabel = (isBusy: boolean, hasResult: boolean): string => {
  if (isBusy) {
    return copy.running;
  }

  if (hasResult) {
    return copy.rerun;
  }

  return copy.run;
};

export { toRunLabel, toScoreRows };

export type { CritiqueView, IssueView, ScoreRow };
