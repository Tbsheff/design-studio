import type { Project, Starter } from "@design-studio/contracts";

import { api, errorText } from "../../api.js";
import type { AppHealth } from "./deps.js";
import { healthProblem } from "./doctor-model.js";
import { shortHome } from "./home-model.js";
import type { Busy } from "./home-model.js";
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

const useOpenFlows = ({
  onOpen,
  setBusy,
  setFormError,
  location,
  health,
  homeDir,
  doctor,
}: FlowDeps) => {
  const openStarter = async (starter: Starter): Promise<void> => {
    setBusy("starter");
    setFormError(null);

    try {
      const { project } = await api.createFromStarter(
        starter.id,
        location ?? undefined
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
      const { project } = await api.createSample(location ?? undefined);
      onOpen(project.id);
    } catch (error) {
      setFormError(errorText(error));
      setBusy(null);
    }
  };

  const openProject = (project: Project): void => {
    const state = health.get(project.id);

    if (!state || (state.state !== "install" && state.state !== "failed")) {
      return onOpen(project.id);
    }

    doctor.open({
      check: async () => {
        const fresh = (await projectsApi.health()).find(
          (item) => item.projectId === project.id
        );

        return (
          !fresh || (fresh.state !== "install" && fresh.state !== "failed")
        );
      },
      problem: healthProblem(
        project,
        state,
        project.imported
          ? shortHome(project.imported.sourcePath, homeDir)
          : project.name,
        homeDir
      ),
      proceed: () => onOpen(project.id),
    });
  };

  return { openProject, openSample, openStarter };
};

export { useOpenFlows };

export type { FlowDeps };
