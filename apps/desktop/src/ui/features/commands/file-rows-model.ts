import { rank } from "./fuzzy.js";
import type { Ranked } from "./fuzzy.js";
import type { Row } from "./palette-row-types.js";

interface SourceFile {
  readonly bytes: number;
  readonly path: string;
}

const FILE_GROUP = "Files";
const FILE_MAX = 60;
const NAME_BONUS = 100;

const toBaseName = (path: string): string =>
  path.slice(path.lastIndexOf("/") + 1);

const toFolder = (path: string): string => {
  const at = path.lastIndexOf("/");

  if (at === -1) {
    return "";
  }

  return path.slice(0, at);
};

const toRunCount = (marks: number[]): number =>
  marks.filter((at, index) => index === 0 || at !== (marks[index - 1] ?? 0) + 1)
    .length;

const toTokenCount = (query: string): number =>
  query.trim().split(/\s+/u).filter(Boolean).length;

const toFileRow = (
  file: SourceFile,
  rowMarks: number[],
  onOpen: (path: string) => void
): Row => ({
  group: FILE_GROUP,
  icon: "file",
  key: `f:${file.path}`,
  kind: "file",
  marks: rowMarks,
  meta: toFolder(file.path),
  run: () => onOpen(file.path),
  title: toBaseName(file.path),
});

const toNameMarks = (path: string, marks: number[]): number[] => {
  const offset = path.length - toBaseName(path).length;
  const out: number[] = [];

  for (const at of marks) {
    if (at >= offset) {
      out.push(at - offset);
    }
  }

  return out;
};

const toNameRanked = (
  files: readonly SourceFile[],
  query: string
): Ranked<SourceFile>[] => {
  const limit = toTokenCount(query);
  const out: Ranked<SourceFile>[] = [];

  for (const hit of rank(files, query, (file) => ({
    title: toBaseName(file.path),
  }))) {
    if (toRunCount(hit.marks) <= limit) {
      out.push({
        item: hit.item,
        marks: hit.marks,
        score: hit.score + NAME_BONUS,
      });
    }
  }

  return out;
};

const toPathRanked = (
  files: readonly SourceFile[],
  query: string,
  seen: Set<string>
): Ranked<SourceFile>[] => {
  const out: Ranked<SourceFile>[] = [];

  for (const hit of rank(files, query, (file) => ({ title: file.path }))) {
    if (!seen.has(hit.item.path)) {
      out.push({
        item: hit.item,
        marks: toNameMarks(hit.item.path, hit.marks),
        score: hit.score,
      });
    }
  }

  return out;
};

const toFileRows = (
  files: readonly SourceFile[],
  query: string,
  onOpen: (path: string) => void
): Row[] => {
  if (query.trim() === "") {
    return files
      .toSorted((left, right) => left.path.localeCompare(right.path))
      .slice(0, FILE_MAX)
      .map((file) => toFileRow(file, [], onOpen));
  }

  const named = toNameRanked(files, query);
  const seen = new Set(named.map((hit) => hit.item.path));
  const rest = toPathRanked(files, query, seen);

  return [...named, ...rest]
    .slice(0, FILE_MAX)
    .map((hit) => toFileRow(hit.item, hit.marks, onOpen));
};

export { toFileRows };

export type { SourceFile };
