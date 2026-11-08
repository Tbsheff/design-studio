interface BriefContext {
  readonly designMd: string | null;
  readonly kit: readonly string[];
  readonly routes: readonly string[];
}

interface BriefResult {
  readonly brief: string;
  readonly isGrounded: boolean;
  readonly model: string;
}

interface RunCommand {
  readonly projectId: string | null;
  readonly prompt: string;
}

export type { BriefContext, BriefResult, RunCommand };
