import type { RefObject } from "react";

import type { PlusMenuActions } from "./plus-menu-model.js";
import { startRepoImport } from "./repo-import-model.js";

interface PlusSource {
  readonly addAppFolder: () => Promise<void>;
  readonly attachFolder: () => Promise<void>;
  readonly attachUrl: () => void;
  readonly contextFileRef: RefObject<HTMLInputElement | null>;
  readonly fileRef: RefObject<HTMLInputElement | null>;
}

const toPlusActions = ({
  addAppFolder,
  attachFolder,
  attachUrl,
  contextFileRef,
  fileRef,
}: PlusSource): Omit<PlusMenuActions, "kind" | "onKind"> => ({
  onAttachFile: (): void => fileRef.current?.click(),
  onAttachFolder: (): void => {
    attachFolder();
  },
  onAttachUrl: attachUrl,
  onAttachZip: (): void => contextFileRef.current?.click(),
  onImportRepo: startRepoImport,
  onLinkCode: (): void => {
    addAppFolder();
  },
});

export { toPlusActions };
