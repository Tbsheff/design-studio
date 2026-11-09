import type { Direction, Project } from "./deps.js";

interface TokenScope {
  readonly direction: Direction;
  readonly project: Project;
}

interface RenameCommand {
  readonly directionId: string;
  readonly name: string;
  readonly newName: string;
  readonly projectId: string;
}

interface RemoveCommand {
  readonly directionId: string;
  readonly name: string;
  readonly projectId: string;
}

interface TokenEditResult {
  readonly changedFiles: readonly string[];
  readonly replacedCount: number;
  readonly versionId: string;
}

interface Rewrite {
  readonly count: number;
  readonly files: readonly FileChange[];
}

interface FileChange {
  readonly after: string;
  readonly before: string;
  readonly relative: string;
}

type RewriteText = (
  text: string,
  relative: string
) => { readonly count: number; readonly text: string };

export type {
  FileChange,
  RemoveCommand,
  RenameCommand,
  Rewrite,
  RewriteText,
  TokenEditResult,
  TokenScope,
};
