import { createLiveStore, useLive } from "../../platform/live-store.js";

interface CodeEditTarget {
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
  readonly projectId: string;
}

const codeEditStore = createLiveStore<CodeEditTarget | null>(null);

const FIRST_LINE = 1;

const setCodeEditFile = (target: Omit<CodeEditTarget, "line">): void => {
  codeEditStore.set({
    directionId: target.directionId,
    file: target.file,
    line: FIRST_LINE,
    projectId: target.projectId,
  });
};

const useCodeEditTarget = (): CodeEditTarget | null => useLive(codeEditStore);

export { codeEditStore, setCodeEditFile, useCodeEditTarget };

export type { CodeEditTarget };
