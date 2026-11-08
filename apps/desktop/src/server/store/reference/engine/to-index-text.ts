import { BYTES_PER_KB, MAX_SUMMARY_CHARS } from "./reference-limits.js";
import type { EntryKind } from "./to-entry-kind.js";

interface IndexEntry {
  readonly bytes: number;
  readonly kind: Exclude<EntryKind, "skip">;
  readonly path: string;
  readonly summary: string | null;
}

interface IndexSource {
  readonly entries: readonly IndexEntry[];
  readonly name: string;
  readonly skippedCount: number;
  readonly source: "file" | "folder" | "zip";
}

const toSizeText = (bytes: number): string => {
  if (bytes < BYTES_PER_KB) {
    return `${bytes} B`;
  }

  const kb = bytes / BYTES_PER_KB;

  if (kb < BYTES_PER_KB) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / BYTES_PER_KB).toFixed(1)} MB`;
};

const toSummaryLine = (text: string): string | null => {
  const line =
    text
      .split("\n")
      .map((candidate) => candidate.trim())
      .find((candidate) => candidate !== "") ?? null;

  if (line === null) {
    return null;
  }

  return line.slice(0, MAX_SUMMARY_CHARS);
};

const toEntryLine = (entry: IndexEntry): string => {
  const head = `- ${entry.path} (${toSizeText(entry.bytes)})`;

  if (entry.summary === null) {
    return head;
  }

  return `${head}: ${entry.summary}`;
};

const toSection = (
  title: string,
  entries: readonly IndexEntry[],
  note: string | null
): string[] => {
  if (entries.length === 0) {
    return [];
  }

  const lines = ["", `## ${title}`];

  if (note !== null) {
    lines.push(note);
  }

  return [...lines, ...entries.map((entry) => toEntryLine(entry))];
};

const toSkippedLine = (skippedCount: number): string[] => {
  if (skippedCount === 0) {
    return [];
  }

  return [
    "",
    "## Skipped",
    `- ${skippedCount} files were skipped (node_modules, .git, hidden files, binaries, or over the size limit).`,
  ];
};

const toIndexText = (index: IndexSource): string => {
  const ofKind = (kind: IndexEntry["kind"]): IndexEntry[] =>
    index.entries.filter((entry) => entry.kind === kind);

  return [
    `# Reference: ${index.name}`,
    "",
    `Read-only reference material the user attached (${index.source}). Read it for facts, brand and content. Do not edit it. Copy what you need into the design.`,
    ...toSection("Text files", ofKind("text"), null),
    ...toSection("Images", ofKind("image"), null),
    ...toSection(
      "Documents",
      ofKind("document"),
      "Open a PDF with the Read tool; it is not indexed as text."
    ),
    ...toSkippedLine(index.skippedCount),
    "",
  ].join("\n");
};

export { toIndexText, toSizeText, toSummaryLine };

export type { IndexEntry, IndexSource };
