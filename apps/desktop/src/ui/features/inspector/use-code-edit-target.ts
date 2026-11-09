import { createLiveStore, useLive } from "../../platform/live-store.js";

interface CodeEditTarget {
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
  readonly projectId: string;
}

const codeEditStore = createLiveStore<CodeEditTarget | null>(null);

const useCodeEditTarget = (): CodeEditTarget | null => useLive(codeEditStore);

export { codeEditStore, useCodeEditTarget };

export type { CodeEditTarget };
