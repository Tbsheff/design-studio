import type { RunLevel } from "@design-studio/contracts";
import type { RefObject } from "react";

import { api, errorText } from "../../api.js";
import type { AppChip } from "./app-chip-model.js";
import { chipBlocker, chipProblem } from "./chip-logic-model.js";
import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import { installProblem } from "./doctor-model.js";
import { shortHome } from "./home-model.js";
import type { Busy } from "./home-model.js";
import { loadAppMenu } from "./lazy-parts-model.js";
import { toOptionalArg } from "./optional-arg-model.js";
import type { useDoctorGate } from "./use-doctor-gate.js";

interface ChipOpenDeps {
  readonly attached: RefObject<{
    readonly images: ImageDraft[];
    readonly references: ReferenceDraft[];
  }>;
  readonly chip: AppChip | null;
  readonly doctor: ReturnType<typeof useDoctorGate>;
  readonly homeDir: string | null;
  readonly level: RunLevel;
  readonly onOpen: (projectId: string) => void;
  readonly setBusy: (busy: Busy) => void;
  readonly setFormError: (message: string | null) => void;
}

interface ChipOpen {
  readonly chipDoctor: (text: string) => void;
  readonly openChip: (text: string, tokensOnly: boolean) => Promise<void>;
  readonly submitChip: (text: string) => void;
}

const toKindLabel = (kind: string | null): string => {
  if (kind === "vite") {
    return "Vite";
  }

  return "Next.js";
};

const runOpenChip = async (
  deps: ChipOpenDeps,
  text: string,
  tokensOnly: boolean
): Promise<void> => {
  const { attached, chip, onOpen, setBusy, setFormError } = deps;

  if (!chip) {
    return;
  }

  setBusy("create");
  setFormError(null);

  try {
    const mod = await loadAppMenu();
    const projectId = await mod.openChip(chip, tokensOnly);

    if (text) {
      await mod.runInProject(projectId, {
        images: attached.current.images.map((image) => image.file),
        level: deps.level,
        prompt: text,
        referenceUrls: attached.current.references.map(
          (reference) => reference.url
        ),
      });
    }

    onOpen(projectId);
  } catch (error) {
    setFormError(errorText(error));
    setBusy(null);
  }
};

const useChipOpen = (deps: ChipOpenDeps): ChipOpen => {
  const { chip, doctor, homeDir, setFormError } = deps;

  const openChip = (text: string, tokensOnly: boolean): Promise<void> =>
    runOpenChip(deps, text, tokensOnly);

  const chipDoctor = (text: string): void => {
    const found = chip?.inspection;
    const install = chipBlocker(chip);

    if (!chip || !found || !install) {
      return;
    }

    doctor.open({
      check: async (): Promise<boolean> => {
        const inspection = await api.inspectFolder(
          found.path,
          ...toOptionalArg(chip.appDir)
        );

        return inspection.depsInstalled !== false;
      },
      problem: installProblem(
        found.name,
        shortHome(found.path, homeDir),
        toKindLabel(found.kind),
        { ...install, homeDir }
      ),
      proceed: (): void => {
        openChip(text, false);
      },
    });
  };

  const submitChip = (text: string): void => {
    if (!chip || chip.isChecking) {
      return;
    }

    const problem = chipProblem(chip);

    if (problem) {
      setFormError(problem);

      return;
    }

    if (chipBlocker(chip)) {
      chipDoctor(text);

      return;
    }

    openChip(text, false);
  };

  return { chipDoctor, openChip, submitChip };
};

export { useChipOpen };

export type { ChipOpen, ChipOpenDeps };
