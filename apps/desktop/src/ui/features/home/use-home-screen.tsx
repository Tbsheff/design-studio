import { DEFAULT_SETTINGS } from "@design-studio/contracts";
import type { PackSummary } from "@design-studio/contracts";

import { useUi } from "../../platform/storage.js";
import { maxVariationsFor } from "../canvas/variations-api.js";
import { ClarifyForm } from "../chat/index.js";
import {
  MODEL_OPTIONS,
  parseDraft,
  toDraft,
} from "../chat/settings-draft-model.js";
import type { SettingsDraft } from "../chat/settings-draft-model.js";
import { usePresence } from "../chat/use-presence.js";
import {
  findPack,
  fontStack,
  loadPackFonts,
  usePacks,
} from "../design-system/packs.js";
import type { PacksState } from "../design-system/packs.js";
import { useHomePrefs } from "./home-prefs-model.js";
import { useHomeBase } from "./use-home-base.js";
import { useHomeComposer } from "./use-home-composer.js";
import { useHomeDraft } from "./use-home-draft.js";
import { useHomeLibrary } from "./use-home-library.js";
import { useHomeModules } from "./use-home-modules.js";
import { useHomeRefs } from "./use-home-refs.js";
import { useHomeStartup } from "./use-home-startup.js";
import { useHomeToast } from "./use-home-toast.js";
import { toMenuPresence, useHomeUi } from "./use-home-ui.js";
import type { HomeScreenOf } from "./use-home-ui.js";
import { useScreenSubmit } from "./use-screen-submit.js";
import type { ScreenSubmit } from "./use-screen-submit.js";

type HomeScreen = HomeScreenOf<SettingsDraft, PacksState> & {
  readonly ClarifyForm: typeof ClarifyForm;
  readonly submit: ScreenSubmit;
};

const MODEL_IDS = MODEL_OPTIONS.map((option) => option.id);

const toInitialDraft = (): SettingsDraft => toDraft(DEFAULT_SETTINGS);

const useHomeScreen = (openHome: (projectId: string) => void): HomeScreen => {
  const base = useHomeBase();
  const refs = useHomeRefs();
  const toasts = useHomeToast();
  const homePrefs = useHomePrefs();
  const { lastPackId } = useUi();
  const packs = usePacks();
  const pack: PackSummary | null = findPack(packs.packs, lastPackId);

  const draft = useHomeDraft({
    initialDraft: toInitialDraft,
    maxDesignsFor: maxVariationsFor,
    modelIds: MODEL_IDS,
  });

  const lib = useHomeLibrary({
    homeBase: base,
    onOpen: openHome,
    pack,
    packs,
    toasts,
  });

  const composer = useHomeComposer({
    base,
    composerRef: refs.composerRef,
    homeDir: lib.homeDir,
    homeRef: refs.homeRef,
    level: draft.settingsDraft.defaultLevel,
    onOpen: openHome,
  });

  const { attach, flow } = composer;

  const packId = pack?.id ?? null;
  const parsed = parseDraft(draft.settingsDraft);

  const submit = useScreenSubmit({
    base,
    composer,
    draft,
    lib,
    openHome,
    packId,
    parsed,
    refs,
  });

  const presence = usePresence(toMenuPresence(flow.isAppMenuOpen));
  useHomeStartup(lib.projects !== null || lib.listError !== null);

  const modules = useHomeModules(homePrefs.hasTemplatesShown, draft.prompt);

  const { busy } = base;

  const ui = useHomeUi({
    attach,
    busy,
    draft,
    flow,
    homePrefs,
    isMenuClosing: presence.closing,
    isMenuShown: presence.shown !== null,
    projects: lib.projects,
  });

  return {
    ClarifyForm,
    base,
    composer,
    draft,
    lib,
    modules,
    refs,
    submit,
    toasts,
    ui,
  };
};

export { fontStack, loadPackFonts, useHomeScreen };

export type { HomeScreen };
