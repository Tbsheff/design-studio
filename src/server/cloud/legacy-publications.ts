import path from "node:path";

import { z } from "zod";

import { readJsonFile } from "../platform/json-file/index.js";

const LegacyPublicationRowSchema = z.looseObject({
  createdAt: z.number().default(0),
  id: z.string(),
  projectId: z.string(),
  url: z.string().default(""),
});

const LegacyPublicationFileSchema = z.array(z.json());

type LegacyPublicationRow = z.infer<typeof LegacyPublicationRowSchema>;

type LegacyPublicationFile = z.infer<typeof LegacyPublicationFileSchema>;

interface LegacyCfRecord {
  readonly id: string;
  readonly legacy: true;
  readonly pid: string;
  readonly publishedAt: number;
  readonly url: string;
}

const toLegacyRow = (row: LegacyPublicationRow): LegacyCfRecord => ({
  id: row.id,
  legacy: true,
  pid: row.projectId,
  publishedAt: row.createdAt,
  url: row.url,
});

const toLegacyRows = (file: LegacyPublicationFile): LegacyCfRecord[] =>
  file.flatMap((entry) => {
    const row = LegacyPublicationRowSchema.safeParse(entry);

    if (!row.success) {
      return [];
    }

    return [toLegacyRow(row.data)];
  });

const readLegacyPublications = async (
  dataDir: string
): Promise<LegacyCfRecord[]> => {
  const file = path.join(dataDir, "publish", "publications.json");

  try {
    const parsed = await readJsonFile(file, LegacyPublicationFileSchema);

    if (!parsed) {
      return [];
    }

    return toLegacyRows(parsed);
  } catch {
    return [];
  }
};

export { readLegacyPublications, toLegacyRow, toLegacyRows };

export type { LegacyCfRecord };
