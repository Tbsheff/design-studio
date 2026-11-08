import type { TrashItem } from "@design-studio/contracts";

import { copy } from "./copy.js";

type Confirm =
  | { readonly kind: "one"; readonly item: TrashItem }
  | {
      readonly kind: "all";
      readonly count: number;
      readonly shouldFolderStay: boolean;
    };

const toCountLabel = (count: number): string => {
  if (count === 1) {
    return copy.oneProject;
  }

  return `${count} ${copy.projectsSuffix}`;
};

const toConfirmTitle = (confirm: Confirm): string => {
  if (confirm.kind === "one") {
    return `Delete “${confirm.item.name}” forever?`;
  }

  return copy.emptyTheTrash;
};

const toConfirmWhat = (confirm: Confirm): string => {
  if (confirm.kind === "one") {
    return copy.irreversibleOne;
  }

  return `${toCountLabel(confirm.count)} ${copy.irreversibleMany}`;
};

const hasFolderStaying = (confirm: Confirm): boolean => {
  if (confirm.kind === "one") {
    return confirm.item.folderStays;
  }

  return confirm.shouldFolderStay;
};

const toConfirmAction = (confirm: Confirm, isBusy: boolean): string => {
  if (isBusy) {
    return copy.deletingEllipsis;
  }

  if (confirm.kind === "one") {
    return copy.deleteForeverAction;
  }

  return copy.emptyTrashAction;
};

const toDeletedNote = (deleted: number): string => {
  if (deleted === 1) {
    return copy.deletedOneForever;
  }

  return `Deleted ${deleted} projects forever.`;
};

const toTrashCountText = (items: readonly TrashItem[] | null): string => {
  if (items === null) {
    return "";
  }

  return toCountLabel(items.length);
};

export {
  hasFolderStaying,
  toConfirmAction,
  toConfirmTitle,
  toConfirmWhat,
  toCountLabel,
  toDeletedNote,
  toTrashCountText,
};

export type { Confirm };
