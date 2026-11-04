import type { Direction, Project } from "./deps.js";

interface AnimationScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

interface TargetCommand {
  readonly directionId: string;
  readonly projectId: string;
}

interface RefCommand extends TargetCommand {
  readonly animationId: string;
}

interface FileChange {
  readonly after: string | null;
  readonly before: string | null;
  readonly relative: string;
}

export type { AnimationScope, FileChange, RefCommand, TargetCommand };
