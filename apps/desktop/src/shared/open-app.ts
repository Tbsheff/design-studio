import type { AppCandidate } from "./actions/_core/contracts";

export type FolderKind = "next" | "vite" | "html" | "tokens";

export interface FolderInspection {
  path: string;
  name: string;
  kind: FolderKind | null;
  appDir: string | null;
  candidates: AppCandidate[];
  depsInstalled: boolean | null;
  install: { command: string; dir: string } | null;
  projectId: string | null;
  problem: string | null;
  workspace?: { root: string; name: string; opened: string } | null;
}
