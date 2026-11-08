import type { FolderInspection } from "./deps.js";

type RunMode = "start" | "url";

interface AppChip {
  readonly path: string;
  readonly inspection: FolderInspection | null;
  readonly isChecking: boolean;
  readonly error: string | null;
  readonly appDir: string | null;
  readonly mode: RunMode;
  readonly url: string;
  readonly env: string;
  readonly nonce: number;
}

export type { AppChip, RunMode };
