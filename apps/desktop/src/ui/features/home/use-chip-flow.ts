import type { RunLevel } from "@design-studio/contracts";
import { type RefObject, useCallback, useEffect, useState } from "react";

import { api, errorText } from "../../api.js";
import { hasNativePicker, pickFolder } from "../../platform/desktop.js";
import { installProblem } from "./doctor-model.js";
import {
  chipBlocker,
  chipProblem,
  droppedFolder,
  useAppChip,
} from "./home-app-chip.js";
import type { ImageDraft, ReferenceDraft } from "./home-composer-parts.js";
import { type Busy, focusPrompt, shortHome } from "./home-model.js";
import { loadAppMenu } from "./lazy-parts.js";
import { useDoctorGate } from "./use-doctor-gate.js";
import { useOpenAppRequests } from "./use-open-app-requests.js";

interface ChipFlowDeps {
  readonly onOpen: (projectId: string) => void;
  readonly setBusy: (busy: Busy) => void;
  readonly setFormError: (message: string | null) => void;
  readonly homeRef: RefObject<HTMLDivElement | null>;
  readonly homeDir: string | null;
  readonly level: RunLevel;
  readonly attached: RefObject<{
    readonly images: ImageDraft[];
    readonly references: ReferenceDraft[];
  }>;
  readonly doctor: ReturnType<typeof useDoctorGate>;
}

function useChipFlow({
  onOpen,
  setBusy,
  setFormError,
  homeRef,
  homeDir,
  level,
  attached,
  doctor,
}: ChipFlowDeps) {
  const app = useAppChip();
  const [folderPop, setFolderPop] = useState(false);
  const [appMenu, setAppMenu] = useState(false);

  const putFolder = useCallback(
    (path: string) => {
      app.set(path);
      setFormError(null);
      focusPrompt(homeRef.current, true);
    },
    [app, homeRef, setFormError]
  );

  const takeDrop = (data: DataTransfer): boolean => {
    const folder = droppedFolder(data);

    if (!folder) {
      return false;
    }

    if ("path" in folder) {
      putFolder(folder.path);
    } else {
      setFormError("Drop a folder in the desktop app, or use Add app folder.");
    }

    return true;
  };

  const addAppFolder = async () => {
    if (!hasNativePicker()) {
      setFolderPop((open) => !open);

      return;
    }

    const picked = await pickFolder({ title: "Choose your app folder" });

    if (picked.kind === "picked") {
      putFolder(picked.path);
    }
  };

  useOpenAppRequests(putFolder, () => void addAppFolder());

  const chipCandidates = app.chip?.inspection?.candidates.length ?? 0;
  const chipPicked = app.chip?.appDir ?? null;
  useEffect(() => {
    if (chipCandidates > 1 && chipPicked === null) {
      setAppMenu(true);
    }
  }, [chipCandidates, chipPicked]);

  const openChip = async (text: string, tokensOnly = false) => {
    const chip = app.chip;

    if (!chip) {
      return;
    }

    setBusy("create");
    setFormError(null);

    try {
      const mod = await loadAppMenu();
      const pid = await mod.openChip(chip, tokensOnly);

      if (text) {
        await mod.runInProject(pid, {
          prompt: text,
          level,
          images: attached.current.images.map((image) => image.file),
          referenceUrls: attached.current.references.map(
            (reference) => reference.url
          ),
        });
      }

      onOpen(pid);
    } catch (err) {
      setFormError(errorText(err));
      setBusy(null);
    }
  };

  const chipDoctor = (text: string) => {
    const chip = app.chip;
    const found = chip?.inspection;
    const install = chipBlocker(chip);

    if (!chip || !found || !install) {
      return;
    }

    doctor.open({
      problem: installProblem(
        found.name,
        shortHome(found.path, homeDir),
        found.kind === "vite" ? "Vite" : "Next.js",
        { ...install, homeDir }
      ),
      check: async () =>
        (await api.inspectFolder(found.path, chip.appDir ?? undefined))
          .depsInstalled !== false,
      proceed: () => void openChip(text),
    });
  };

  const submitChip = (text: string) => {
    const chip = app.chip;

    if (!chip || chip.checking) {
      return;
    }

    const problem = chipProblem(chip);

    if (problem) {
      setFormError(problem);
    } else if (chipBlocker(chip)) {
      chipDoctor(text);
    } else {
      void openChip(text);
    }
  };

  return {
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
  };
}

export { useChipFlow };

export type { ChipFlowDeps };
