import type { Pop } from "./home-model.js";

interface PopState {
  readonly pop: Pop;
  readonly shown: Pop;
  readonly isClosing: boolean;
  readonly close: (shouldRefocus: boolean) => void;
  readonly toggle: (next: Exclude<Pop, null>) => void;
}

const toKindTip = (kind: string): string => {
  if (kind === "react") {
    return "React + Vite project. Press for a plain HTML page.";
  }

  return "Plain HTML page. Press for a React + Vite project.";
};

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

export { toKindTip, toNextFolderPop, toNextKind, toSendLabel };

export type { PopState };
