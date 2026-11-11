import type { RefObject } from "react";

import { uiStore } from "../../platform/storage.js";
import { focusRequest } from "./focus-bus-model.js";
import { homePrefs } from "./home-prefs-model.js";
import type { PlusMenuActions } from "./plus-menu-model.js";
import { startRepoImport } from "./repo-import-model.js";

interface PlusSource {
  readonly addAppFolder: () => Promise<void>;
  readonly attachFolder: () => Promise<void>;
  readonly attachUrl: () => void;
  readonly contextFileRef: RefObject<HTMLInputElement | null>;
  readonly fileRef: RefObject<HTMLInputElement | null>;
  readonly hasTemplatesShown: boolean;
  readonly openAdvanced: () => void;
}

const toPlusActions = ({
  addAppFolder,
  attachFolder,
  attachUrl,
  contextFileRef,
  fileRef,
  hasTemplatesShown,
  openAdvanced,
}: PlusSource): Omit<
  PlusMenuActions,
  "kind" | "onDesignSystem" | "onKind"
> => ({
  hasTemplatesShown,
  onAttachFile: (): void => fileRef.current?.click(),
  onAttachFolder: (): void => {
    attachFolder();
  },
  onAttachUrl: attachUrl,
  onAttachZip: (): void => contextFileRef.current?.click(),
  onImportRepo: startRepoImport,
  onImportSystem: (): void =>
    uiStore.set({ libraryFrom: null, screen: "design-systems" }),
  onLinkCode: (): void => {
    addAppFolder();
  },
  onLocation: (): void => focusRequest("location", false, false),
  onSkills: openAdvanced,
  onTemplates: (): void =>
    homePrefs.set({ hasTemplatesShown: !hasTemplatesShown }),
});

export { toPlusActions };
