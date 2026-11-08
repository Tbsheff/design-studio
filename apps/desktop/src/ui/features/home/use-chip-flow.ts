import type { RunLevel } from "@design-studio/contracts";
import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

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
import { focusPrompt, shortHome } from "./home-model.js";
import type { Busy } from "./home-model.js";
import { loadAppMenu } from "./lazy-parts.js";
import type { useDoctorGate } from "./use-doctor-gate.js";
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

  const addAppFolder = async (): Promise<void> => {
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

  const openChip = async (text: string, tokensOnly = false): Promise<void> => {
    const { chip } = app;

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
          images: attached.current.images.map((image) => image.file),
          level,
          prompt: text,
          referenceUrls: attached.current.references.map(
            (reference) => reference.url
          ),
        });
      }

      onOpen(pid);
    } catch (error) {
      setFormError(errorText(error));
      setBusy(null);
    }
  };

  const chipDoctor = (text: string): void => {
    const { chip } = app;
    const found = chip?.inspection;
    const install = chipBlocker(chip);

    if (!chip || !found || !install) {
      return;
    }

    doctor.open({
      check: async () =>
        (await api.inspectFolder(found.path, chip.appDir ?? undefined))
          .depsInstalled !== false,
      problem: installProblem(
        found.name,
        shortHome(found.path, homeDir),
        found.kind === "vite" ? "Vite" : "Next.js",
        { ...install, homeDir }
      ),
      proceed: () => void openChip(text),
    });
  };

  const submitChip = (text: string): void => {
    const { chip } = app;

    if (!chip || chip.isChecking) {
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
    addAppFolder,
    app,
    appMenu,
    chipDoctor,
    folderPop,
    openChip,
    putFolder,
    setAppMenu,
    setFolderPop,
    submitChip,
    takeDrop,
  };
}

export { useChipFlow };

export type { ChipFlowDeps };
