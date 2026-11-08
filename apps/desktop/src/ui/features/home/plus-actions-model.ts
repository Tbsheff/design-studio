import type { RefObject } from "react";

import { uiStore } from "../../platform/storage.js";
import { focusRequest } from "./focus-bus-model.js";
import { homePrefs } from "./home-prefs-model.js";
import type { PlusMenuActions } from "./plus-menu-model.js";

interface PlusSource {
  readonly addAppFolder: () => Promise<void>;
  readonly fileRef: RefObject<HTMLInputElement | null>;
  readonly hasTemplatesShown: boolean;
  readonly openAdvanced: () => void;
}

const toPlusActions = ({
  addAppFolder,
  fileRef,
  hasTemplatesShown,
  openAdvanced,
}: PlusSource): Omit<PlusMenuActions, "onDesignSystem"> => ({
  hasTemplatesShown,
  onAttachFile: (): void => fileRef.current?.click(),
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
