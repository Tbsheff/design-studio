import { DEFAULT_SETTINGS } from "@design-studio/contracts";
import type {
  ClarifyQuestion,
  ProjectKind,
  Starter,
} from "@design-studio/contracts";
import { needsQuestions } from "@design-studio/contracts/clarify";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";

import { api, errorText } from "../../api.js";
import { prefetchScreensWhenIdle } from "../../app/screen-preload.js";
import { uiStore, useUi } from "../../platform/storage.js";
import { reportAppStart } from "../../platform/telemetry.js";
import { maxVariationsFor } from "../canvas/variations-api.js";
import {
  MODEL_OPTIONS,
  parseDraft,
  toDraft,
} from "../chat/settings-draft-model.js";
import { usePresence } from "../chat/use-presence.js";
import { findPack, usePacks } from "../design-system/packs.js";
import { AppChipView } from "./home-app-chip.js";
import { useComposerAttachments } from "./home-composer-parts.js";
import type { ImageDraft, ReferenceDraft } from "./home-composer-parts.js";
import {
  createFromHome,
  focusIn,
  focusPrompt,
  folderLabel,
  homeOf,
  homeSendBlocker,
  isEmpty,
  modelSummary,
} from "./home-model.js";
import type { Busy } from "./home-model.js";
import type { ModelSettings } from "./home-popovers.js";
import { homePrefs, useHomePrefs } from "./home-prefs-model.js";
import { useHomeProjects, useProjectActions } from "./home-sections.js";
import type { HomeToastState } from "./home-sections.js";
import type { HomeTemplate } from "./home-templates.js";
import {
  loadExtras,
  loadLibrary,
  loadSlash,
  loadTemplates,
} from "./lazy-parts.js";
import { useAppHealth } from "./projects-store-model.js";
import { useChipFlow } from "./use-chip-flow.js";
import { useDoctorGate } from "./use-doctor-gate.js";
import { useFolderChooser } from "./use-folder-chooser.js";
import { useModule } from "./use-module.js";
import { useOpenFlows } from "./use-open-flows.js";
import { useRootDrop } from "./use-root-drop.js";
import { locationFor, useWorkspaces } from "./use-workspaces.js";

function useHomeScreen(onOpen: (projectId: string) => void) {
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<ProjectKind>("html");
  const [busy, setBusy] = useState<Busy>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [settingsDraft, setSettingsDraft] = useState(() =>
    toDraft(DEFAULT_SETTINGS)
  );

  const [designMd, setDesignMd] = useState("");
  const [designs, setDesigns] = useState(1);
  const maxDesigns = maxVariationsFor(kind);
  const designCount = Math.min(designs, maxDesigns);
  const packs = usePacks();
  const { lastPackId, lastLocation } = useUi();
  const prefs = useHomePrefs();
  const pack = findPack(packs.packs, lastPackId);
  const [advancedOpened, setAdvancedOpened] = useState(0);

  const [template, setTemplate] = useState<{
    readonly id: string;
    readonly label: string;
    readonly starter: Starter | null;
  } | null>(null);

  const chooser = useFolderChooser(setFormError);
  const homeRef = useRef<HTMLDivElement>(null);

  const slashKeys = useRef<((e: KeyboardEvent<HTMLElement>) => boolean) | null>(
    null
  );

  const { workspaces, addFolder } = useWorkspaces(setFormError);
  const [questions, setQuestions] = useState<ClarifyQuestion[] | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<HomeToastState | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const doctor = useDoctorGate();
  const { projects, listError, loadProjects, searchRef } = useHomeProjects();
  const health = useAppHealth(projects);
  const homeDir = homeOf(workspaces);

  const attached = useRef<{
    readonly images: ImageDraft[];
    readonly references: ReferenceDraft[];
  }>({ images: [], references: [] });

  const flow = useChipFlow({
    attached,
    doctor,
    homeDir,
    homeRef,
    level: settingsDraft.defaultLevel,
    onOpen,
    setBusy,
    setFormError,
  });

  const {
    app,
    folderPop,
    setFolderPop,
    appMenu,
    setAppMenu,
    putFolder,
    takeDrop,
    addAppFolder,
    openChip,
    chipDoctor,
    submitChip,
  } = flow;

  const shownAppMenu = usePresence(appMenu ? "menu" : null);
  const templates = useModule(loadTemplates, prefs.hasTemplatesShown);
  const extras = useModule(loadExtras, true);
  const library = useModule(loadLibrary, true);
  const listed = projects !== null || listError !== null;
  const empty = isEmpty(projects);
  useEffect(() => {
    if (!listed) {
      return;
    }

    reportAppStart("home");
    prefetchScreensWhenIdle();
  }, [listed]);

  const {
    images,
    references,
    dragging,
    fileRef,
    addImages,
    removeImage,
    removeReference,
    onPromptPaste,
    dropHandlers,
  } = useComposerAttachments(setFormError, takeDrop);

  attached.current = { images, references };
  const { windowDrag, rootDrop } = useRootDrop(takeDrop, setFormError);

  const showToast = useCallback(
    (next: Omit<HomeToastState, "id">) => setToast({ ...next, id: Date.now() }),
    []
  );

  const clearToast = useCallback(() => setToast(null), []);

  const location = locationFor(workspaces, lastLocation);

  const { openStarter, openSample, openProject } = useOpenFlows({
    doctor,
    health,
    homeDir,
    location,
    onOpen,
    setBusy,
    setFormError,
  });

  const setLocation = (path: string | null) =>
    uiStore.set({ lastLocation: path });

  const locationLabel = folderLabel(workspaces, location);

  const build = async (finalPrompt: string) => {
    const parsed = parseDraft(settingsDraft);

    if ("error" in parsed) {
      setFormError(parsed.error);

      return;
    }

    setBusy("create");
    setFormError(null);

    try {
      const project = await createFromHome({
        designCount,
        designMd,
        images,
        kind,
        location,
        packId: pack?.id ?? null,
        prompt: finalPrompt,
        references,
        settings: parsed.settings,
      });

      onOpen(project.id);
    } catch (error) {
      setFormError(errorText(error));
      setBusy(null);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();

    if (busy !== null) {
      return;
    }

    if (app.chip) {
      return submitChip(text);
    }

    if (!text) {
      return;
    }

    if (questions !== null) {
      document.querySelector<HTMLFormElement>("form.clarify")?.requestSubmit();

      return;
    }

    if (needsQuestions(text)) {
      setBusy("ask");
      setFormError(null);

      const asked = await api
        .clarify(text)
        .catch(() => ({ questions: [] as ClarifyQuestion[] }));

      setBusy(null);

      if (asked.questions.length > 0) {
        setQuestions(asked.questions);

        return;
      }
    }

    await build(text);
  };

  const actions = useProjectActions({
    homeDir,
    onOpen: openProject,
    onOpenTrash: () => setTrashOpen(true),
    showToast,
  });

  const pickTemplate = (picked: HomeTemplate, starter: Starter | null) => {
    if (template?.id === picked.id) {
      setTemplate(null);

      return;
    }

    setTemplate({ id: picked.id, label: picked.label, starter });
    setPrompt(picked.prompt);
    setQuestions(null);

    if (picked.kind) {
      setKind(picked.kind);
    }

    const { level } = picked;

    if (level) {
      setSettingsDraft((d) => ({ ...d, defaultLevel: level }));
    }

    focusPrompt(null, true);
  };

  const changeKind = (next: ProjectKind) => {
    setKind(next);
    setDesigns((n) => Math.min(n, maxVariationsFor(next)));
  };

  const modelValue = modelSummary(settingsDraft.model, designCount);

  const modelSizes = MODEL_OPTIONS.map((option) =>
    modelSummary(option.id, designCount)
  );

  const openAdvanced = () => {
    setAdvancedOpened((n) => n + 1);
    focusIn(".advanced summary");
  };

  const plusActions = {
    hasTemplatesShown: prefs.hasTemplatesShown,
    onAttachFile: () => fileRef.current?.click(),
    onImportSystem: () =>
      uiStore.set({ screen: "design-systems", libraryFrom: null }),
    onLinkCode: () => void addAppFolder(),
    onLocation: () => focusIn("#new-project-location"),
    onSkills: openAdvanced,
    onTemplates: () =>
      homePrefs.set({ hasTemplatesShown: !prefs.hasTemplatesShown }),
  };

  const sendBlocker = homeSendBlocker(
    busy,
    prompt,
    questions !== null,
    app.chip
  );

  const modelSettings: ModelSettings = {
    designs: { max: maxDesigns, onChange: setDesigns, value: designCount },
    level: settingsDraft.defaultLevel,
    model: settingsDraft.model,
    onLevel: (defaultLevel) =>
      setSettingsDraft((d) => ({ ...d, defaultLevel })),
    onModel: (model) => setSettingsDraft((d) => ({ ...d, model })),
    onMore: openAdvanced,
  };

  const slashMod = useModule(loadSlash, prompt.startsWith("/"));

  const chipLead: ReactNode = app.chip ? (
    <AppChipView
      chip={app.chip}
      isMenuOpen={appMenu}
      onMenu={() => setAppMenu((open) => !open)}
      onRemove={app.clear}
    />
  ) : null;

  return {
    actions,
    addAppFolder,
    addFolder,
    addImages,
    advancedOpened,
    app,
    build,
    busy,
    changeKind,
    chipDoctor,
    chipLead,
    chipRef,
    chooser,
    clearToast,
    create,
    designMd,
    doctor,
    dragging,
    dropHandlers,
    empty,
    extras,
    fileRef,
    folderPop,
    formError,
    health,
    homeDir,
    homeRef,
    images,
    kind,
    lastPackId,
    library,
    listError,
    loadProjects,
    location,
    locationLabel,
    modelSettings,
    modelSizes,
    modelValue,
    onPromptPaste,
    openChip,
    openSample,
    openStarter,
    pack,
    packs,
    pickTemplate,
    plusActions,
    prefs,
    projects,
    prompt,
    putFolder,
    query,
    questions,
    references,
    removeImage,
    removeReference,
    rootDrop,
    searchRef,
    sendBlocker,
    setAppMenu,
    setDesignMd,
    setFolderPop,
    setFormError,
    setLocation,
    setPrompt,
    setQuery,
    setQuestions,
    setSettingsDraft,
    setTrashOpen,
    settingsDraft,
    shownAppMenu,
    slashKeys,
    slashMod,
    template,
    templates,
    toast,
    trashOpen,
    windowDrag,
    workspaces,
  };
}

export { useHomeScreen };
