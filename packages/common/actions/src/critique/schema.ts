import { Schema } from "effect";

const MAX_ISSUES = 12;

const MAX_SCORE = 10;

const CritiqueScoreSchema = Schema.Int.check(
  Schema.isBetween({ maximum: MAX_SCORE, minimum: 0 })
);

const CritiqueSeveritySchema = Schema.Literals(["high", "medium", "low"]);

const CritiqueScoresSchema = Schema.Struct({
  color: CritiqueScoreSchema,
  copy: CritiqueScoreSchema,
  hierarchy: CritiqueScoreSchema,
  spacing: CritiqueScoreSchema,
  type: CritiqueScoreSchema,
});

const CritiqueIssueSchema = Schema.Struct({
  fix: Schema.String,
  layerId: Schema.NullOr(Schema.String),
  message: Schema.String,
  selector: Schema.NullOr(Schema.String),
  severity: CritiqueSeveritySchema,
});

const CritiqueSchema = Schema.Struct({
  frameId: Schema.String,
  issues: Schema.Array(CritiqueIssueSchema).check(
    Schema.isMaxLength(MAX_ISSUES)
  ),
  scores: CritiqueScoresSchema,
});

export {
  CritiqueIssueSchema,
  CritiqueSchema,
  CritiqueScoresSchema,
  CritiqueScoreSchema,
  CritiqueSeveritySchema,
  MAX_ISSUES,
};
