import type {
  PatternDetailSchema,
  PatternInsertedSchema,
  PatternSchema,
} from "@design-studio/actions/pattern/schema";

type StoredPattern = typeof PatternDetailSchema.Type;

type PatternSummary = typeof PatternSchema.Type;

type PatternInserted = typeof PatternInsertedSchema.Type;

type InsertPosition = "after" | "before" | "inside" | "replace";

const toSummary = (pattern: StoredPattern): PatternSummary => ({
  id: pattern.id,
  importCount: pattern.imports.length,
  isClient: pattern.isClient,
  kind: pattern.kind,
  name: pattern.name,
  savedAt: pattern.savedAt,
  sourceName: pattern.sourceName,
  tags: pattern.tags,
  tokenCount: pattern.tokens.length,
});

export { toSummary };

export type { InsertPosition, PatternInserted, PatternSummary, StoredPattern };
