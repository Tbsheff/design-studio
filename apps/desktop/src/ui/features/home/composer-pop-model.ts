import type { Pop } from "./home-model.js";

interface PopState {
  readonly pop: Pop;
  readonly shown: Pop;
  readonly isClosing: boolean;
  readonly close: (shouldRefocus: boolean) => void;
  readonly toggle: (next: Exclude<Pop, null>) => void;
}

const toNextKind = (kind: string): "html" | "react" => {
  if (kind === "react") {
    return "html";
  }

  return "react";
};

const toNextFolderPop = (current: Pop, isFolderPopOpen: boolean): Pop => {
  if (isFolderPopOpen) {
    return "folder";
  }

  if (current === "folder") {
    return null;
  }

  return current;
};

const toSendLabel = (hasChip: boolean): string => {
  if (hasChip) {
    return "Open";
  }

  return "Create";
};

export { toNextFolderPop, toNextKind, toSendLabel };

export type { PopState };
