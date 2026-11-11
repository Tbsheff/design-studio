import type { ActionDone } from "@design-studio/actions/app-stream";
import type { Project } from "@design-studio/contracts";
import { useEffect } from "react";

import { api } from "../../api";
import { setPrototypeSource } from "../../platform/prototype-dialog";
import { subscribeDone } from "../../platform/query";
import { openProject } from "../project-nav";

const CREATE_PROTOTYPE_ID = "project.createPrototype";

const toNewestPrototype = (
  projects: readonly Project[],
  appProjectId: string
): Project | null =>
  projects
    .filter((project) => project.appProjectId === appProjectId)
    .toSorted((left, right) => right.createdAt - left.createdAt)[0] ?? null;

const openNewestPrototype = async (appProjectId: string): Promise<void> => {
  const newest = toNewestPrototype(await api.listProjects(), appProjectId);

  if (newest !== null) {
    openProject(newest.id);
  }
};

const isPrototypeDone = (done: ActionDone, appProjectId: string): boolean =>
  done.actionId === CREATE_PROTOTYPE_ID && done.projectId === appProjectId;

const toAppProjectId = (project: Project): string | null => {
  if (project.app) {
    return project.id;
  }

  return null;
};

const clearSource = (): void => {
  setPrototypeSource(null);
};

const usePrototypeFollow = (project: Project): void => {
  const appProjectId = toAppProjectId(project);

  useEffect((): (() => void) => {
    setPrototypeSource(appProjectId);

    if (appProjectId === null) {
      return clearSource;
    }

    const stop = subscribeDone((done): void => {
      if (isPrototypeDone(done, appProjectId)) {
        void openNewestPrototype(appProjectId);
      }
    });

    return (): void => {
      stop();
      clearSource();
    };
  }, [appProjectId]);
};

export { usePrototypeFollow };
