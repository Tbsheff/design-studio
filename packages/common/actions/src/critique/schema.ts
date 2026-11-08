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

const MAX_ATTENTION_ELEMENTS = 8;

const MAX_CLARITY = 100;

const MAX_NOTES = 8;

const AttentionElementSchema = Schema.Struct({
  label: Schema.String,
  layerId: Schema.NullOr(Schema.String),
  rank: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  selector: Schema.String,
  share: Schema.Number,
});

const AttentionNoteKindSchema = Schema.Literals([
  "primary-not-in-top-3",
  "competing-focal-points",
  "low-contrast-primary",
  "text-wall",
]);

const AttentionNoteSchema = Schema.Struct({
  kind: AttentionNoteKindSchema,
  layerId: Schema.NullOr(Schema.String),
  message: Schema.String,
});

const AttentionResultSchema = Schema.Struct({
  clarityScore: Schema.Int.check(
    Schema.isBetween({ maximum: MAX_CLARITY, minimum: 0 })
  ),
  frameId: Schema.String,
  heatmapPath: Schema.String,
  notes: Schema.Array(AttentionNoteSchema).check(Schema.isMaxLength(MAX_NOTES)),
  topElements: Schema.Array(AttentionElementSchema).check(
    Schema.isMaxLength(MAX_ATTENTION_ELEMENTS)
  ),
});

const AttentionSavedSchema = Schema.Struct({
  result: Schema.NullOr(AttentionResultSchema),
});

export {
  AttentionElementSchema,
  AttentionNoteKindSchema,
  AttentionNoteSchema,
  AttentionResultSchema,
  AttentionSavedSchema,
  MAX_ATTENTION_ELEMENTS,
  MAX_CLARITY,
  MAX_NOTES,
  CritiqueIssueSchema,
  CritiqueSchema,
  CritiqueScoresSchema,
  CritiqueScoreSchema,
  CritiqueSeveritySchema,
  MAX_ISSUES,
};
