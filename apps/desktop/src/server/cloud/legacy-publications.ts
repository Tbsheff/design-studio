import { Schema } from "effect";

interface LegacyCloudflareRecord {
  readonly id: string;
  readonly isLegacy: true;
  readonly projectId: string;
  readonly publishedAt: number;
  readonly url: string;
}

const LegacyPublicationRowSchema = Schema.Struct({
  createdAt: Schema.optionalKey(Schema.Number),
  id: Schema.String,
  projectId: Schema.String,
  url: Schema.optionalKey(Schema.String),
});

type LegacyPublicationRow = typeof LegacyPublicationRowSchema.Type;

const toLegacyRecord = (row: LegacyPublicationRow): LegacyCloudflareRecord => ({
  id: row.id,
  isLegacy: true,
  projectId: row.projectId,
  publishedAt: row.createdAt ?? 0,
  url: row.url ?? "",
});

export { LegacyPublicationRowSchema, toLegacyRecord };

export type { LegacyCloudflareRecord, LegacyPublicationRow };
