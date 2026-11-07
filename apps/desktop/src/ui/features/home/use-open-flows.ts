import type { Project, Starter } from "@design-studio/contracts";

import type { AppHealth } from "../../../shared/found-apps.js";
import { api, errorText } from "../../api.js";
import { healthProblem } from "./doctor-model.js";
import { type Busy, shortHome } from "./home-model.js";
import { projectsApi } from "./projects-store-model.js";
import { useDoctorGate } from "./use-doctor-gate.js";

interface FlowDeps {
  readonly onOpen: (projectId: string) => void;
  readonly setBusy: (busy: Busy) => void;
  readonly setFormError: (message: string | null) => void;
  readonly location: string | null;
  readonly health: Map<string, AppHealth>;
  readonly homeDir: string | null;
  readonly doctor: ReturnType<typeof useDoctorGate>;
}

function useOpenFlows({
  onOpen,
  setBusy,
  setFormError,
  location,
  health,
  homeDir,
  doctor,
}: FlowDeps) {
  const openStarter = async (starter: Starter) => {
    setBusy("starter");
    setFormError(null);

    try {
      const { project } = await api.createFromStarter(
        starter.id,
        location ?? undefined
      );

      onOpen(project.id);
    } catch (err) {
      setFormError(`Could not open ${starter.name}: ${errorText(err)}`);
      setBusy(null);
    }
  };

  const openSample = async () => {
    setBusy("starter");

    try {
      const { project } = await api.createSample(location ?? undefined);
      onOpen(project.id);
    } catch (err) {
      setFormError(errorText(err));
      setBusy(null);
    }
  };

  const openProject = (project: Project) => {
    const state = health.get(project.id);

    if (!state || (state.state !== "install" && state.state !== "failed")) {
      return onOpen(project.id);
    }

    doctor.open({
      problem: healthProblem(
        project,
        state,
        project.imported
          ? shortHome(project.imported.sourcePath, homeDir)
          : project.name,
        homeDir
      ),
      check: async () => {
        const fresh = (await projectsApi.health()).find(
          (item) => item.projectId === project.id
        );

        return (
          !fresh || (fresh.state !== "install" && fresh.state !== "failed")
        );
      },
      proceed: () => onOpen(project.id),
    });
  };

  return { openStarter, openSample, openProject };
}

export { useOpenFlows };

export type { FlowDeps };
