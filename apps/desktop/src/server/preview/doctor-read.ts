import type {
  DoctorView,
  DoctorViewText,
} from "@design-studio/actions/workspace/schema";
import type { AppServerStatus, Project } from "@design-studio/contracts";
import { describeDoctor } from "@design-studio/contracts/app-doctor";

import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { AppControl, PreviewService } from "../types.js";

type DoctorControl = Required<Pick<AppControl, "doctor">> & AppControl;

const appProject = async (
  projects: StudioProjectStore,
  projectId: string
): Promise<Project> => {
  const project = await projects.get(projectId);

  if (!project.app) {
    throw new NotFoundError(`project ${projectId} is not an attached app`);
  }

  return project;
};

const doctorControl = (preview: PreviewService | null): DoctorControl => {
  const apps = preview?.apps;

  if (!apps?.doctor) {
    throw new BadRequestError("app servers are not available");
  }

  return apps as DoctorControl;
};

const toStatusLine = (status: AppServerStatus): string => {
  const parts = [`Dev server: ${status.state}`];

  if (status.upstream) {
    parts.push(` at ${status.upstream}`);
  }

  if (status.message) {
    parts.push(` (${status.message})`);
  }

  return `${parts.join("")}.`;
};

const readDoctor = async (
  projects: StudioProjectStore,
  preview: PreviewService | null,
  projectId: string,
  isFresh: boolean
): Promise<DoctorView> => {
  const project = await appProject(projects, projectId);
  const apps = doctorControl(preview);
  const doctor = await apps.doctor(project, isFresh);

  return { doctor, status: apps.status(project) };
};

const toDoctorText = (view: DoctorView): DoctorViewText => ({
  doctor: view.doctor,
  status: view.status,
  text: `${toStatusLine(view.status)}\n\n${describeDoctor(view.doctor)}`,
});

export { appProject, doctorControl, readDoctor, toDoctorText };

export type { DoctorControl };
