import type { PackSummary } from "@design-studio/contracts";

import { homeSendBlocker, isEmpty } from "./home-model.js";
import type { HomePrefs } from "./home-prefs-model.js";
import type { ModelSettings } from "./model-settings-model.js";
import { toPlusActions } from "./plus-actions-model.js";
import type { PlusMenuActions } from "./plus-menu-model.js";
import type { ChipFlow } from "./use-chip-flow.js";
import type { ComposerAttachments } from "./use-composer-attachments.js";
import type { HomeBase } from "./use-home-base.js";
import type { HomeComposer } from "./use-home-composer.js";
import type { HomeDraft, SettingsLike } from "./use-home-draft.js";
import type { HomeLibrary } from "./use-home-library.js";
import type { HomeModules } from "./use-home-modules.js";
import type { HomeRefs } from "./use-home-refs.js";
import type { HomeSubmit } from "./use-home-submit.js";
import type { HomeToastControls } from "./use-home-toast.js";

interface HomeUi {
  readonly isEmpty: boolean;
  readonly isMenuClosing: boolean;
  readonly isMenuShown: boolean;
  readonly modelSettings: ModelSettings;
  readonly plusActions: Omit<
    PlusMenuActions,
    "kind" | "onDesignSystem" | "onKind"
  >;
  readonly prefs: HomePrefs;
  readonly sendBlocker: string | null;
}

interface HomeScreenOf<Draft extends SettingsLike, Packs> {
  readonly base: HomeBase;
  readonly composer: HomeComposer;
  readonly draft: HomeDraft<Draft>;
  readonly lib: HomeLibrary<Packs, PackSummary | null>;
  readonly modules: HomeModules;
  readonly refs: HomeRefs;
  readonly submit: HomeSubmit;
  readonly toasts: HomeToastControls;
  readonly ui: HomeUi;
}

interface UiDeps<Draft extends SettingsLike> {
  readonly attach: ComposerAttachments;
  readonly busy: HomeBase["busy"];
  readonly draft: HomeDraft<Draft>;
  readonly flow: ChipFlow;
  readonly homePrefs: HomePrefs;
  readonly isMenuClosing: boolean;
  readonly isMenuShown: boolean;
  readonly projects: HomeLibrary<unknown, unknown>["projects"];
}

const toMenuPresence = (isOpen: boolean): string | null => {
  if (isOpen) {
    return "menu";
  }

  return null;
};

const toModelSettings = <Draft extends SettingsLike>(
  draft: HomeDraft<Draft>
): ModelSettings => ({
  designs: {
    max: draft.maxDesigns,
    onChange: draft.setDesigns,
    value: draft.designCount,
  },
  level: draft.settingsDraft.defaultLevel,
  model: draft.settingsDraft.model,
  onLevel: (defaultLevel): void =>
    draft.setSettingsDraft((current) => ({ ...current, defaultLevel })),
  onModel: (model): void =>
    draft.setSettingsDraft((current) => ({ ...current, model })),
  onMore: draft.openAdvanced,
});

const useHomeUi = <Draft extends SettingsLike>(deps: UiDeps<Draft>): HomeUi => {
  const { attach, busy, draft, flow, homePrefs, projects } = deps;

  return {
    isEmpty: isEmpty(projects),
    isMenuClosing: deps.isMenuClosing,
    isMenuShown: deps.isMenuShown,
    modelSettings: toModelSettings(draft),
    plusActions: toPlusActions({
      addAppFolder: flow.addAppFolder,
      attachFolder: attach.pickContextFolder,
      attachUrl: attach.openUrlForm,
      contextFileRef: attach.contextFileRef,
      fileRef: attach.fileRef,
      hasTemplatesShown: homePrefs.hasTemplatesShown,
      isAskingFirst: homePrefs.shouldAskFirst,
      openAdvanced: draft.openAdvanced,
    }),
    prefs: homePrefs,
    sendBlocker: homeSendBlocker(
      busy,
      draft.prompt,
      draft.questions !== null,
      flow.app.chip
    ),
  };
};

export { toMenuPresence, useHomeUi };

export type { HomeScreenOf, HomeUi, UiDeps };
