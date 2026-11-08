import type { Project, Starter } from "@design-studio/contracts";

import { api, errorText } from "../../api.js";
import type { AppHealth } from "./deps.js";
import { healthProblem } from "./doctor-model.js";
import { shortHome } from "./home-model.js";
import type { Busy } from "./home-model.js";
import { toOptionalArg } from "./optional-arg-model.js";
import { projectsApi } from "./projects-store-model.js";
import type { useDoctorGate } from "./use-doctor-gate.js";

interface FlowDeps {
  readonly onOpen: (projectId: string) => void;
  readonly setBusy: (busy: Busy) => void;
  readonly setFormError: (message: string | null) => void;
  readonly location: string | null;
  readonly health: Map<string, AppHealth>;
  readonly homeDir: string | null;
  readonly doctor: ReturnType<typeof useDoctorGate>;
}

interface OpenFlows {
  readonly openProject: (project: Project) => void;
  readonly openSample: () => Promise<void>;
  readonly openStarter: (starter: Starter) => Promise<void>;
}

const isHealthBroken = (state: AppHealth | null): boolean =>
  state !== null && (state.state === "install" || state.state === "failed");

const toProjectSource = (project: Project, homeDir: string | null): string => {
  if (project.imported) {
    return shortHome(project.imported.sourcePath, homeDir);
  }

  return project.name;
};

const useOpenFlows = ({
  onOpen,
  setBusy,
  setFormError,
  location,
  health,
  homeDir,
  doctor,
}: FlowDeps): OpenFlows => {
  const openStarter = async (starter: Starter): Promise<void> => {
    setBusy("starter");
    setFormError(null);

    try {
      const { project } = await api.createFromStarter(
        starter.id,
        ...toOptionalArg(location)
      );

      onOpen(project.id);
    } catch (error) {
      setFormError(`Could not open ${starter.name}: ${errorText(error)}`);
      setBusy(null);
    }
  };

  const openSample = async (): Promise<void> => {
    setBusy("starter");

    try {
      const { project } = await api.createSample(...toOptionalArg(location));
      onOpen(project.id);
    } catch (error) {
      setFormError(errorText(error));
      setBusy(null);
    }
  };

  const openProject = (project: Project): void => {
    const state = health.get(project.id) ?? null;

    if (!state || !isHealthBroken(state)) {
      onOpen(project.id);

      return;
    }

    doctor.open({
      check: async (): Promise<boolean> => {
        const all = await projectsApi.health();
        const fresh = all.find((item) => item.projectId === project.id) ?? null;

        return !fresh || !isHealthBroken(fresh);
      },
      problem: healthProblem(
        project,
        state,
        toProjectSource(project, homeDir),
        homeDir
      ),
      proceed: (): void => onOpen(project.id),
    });
  };

  return { openProject, openSample, openStarter };
};

export { useOpenFlows };

export type { FlowDeps, OpenFlows };
