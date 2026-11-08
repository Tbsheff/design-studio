import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";

import type { AttachAppRequest, Project } from "@design-studio/contracts";
import type {
  AppFixResult,
  DoctorCause,
  DoctorCauseKind,
} from "@design-studio/contracts/app-doctor";

import type { PreviewService } from "../../shared/server-ports.js";
import { BadRequestError, ConflictError } from "../platform/errors/index.js";
import type { StudioProjectStore } from "../store/index.js";
import { appProject, doctorControl } from "./doctor-read.js";

interface AppFixRuntime {
  readonly preview: PreviewService | null;
  readonly projects: StudioProjectStore;
}

interface AppPatch {
  readonly env: Readonly<Record<string, string>> | null;
  readonly url: string | null;
}

const applyEnvExample = async (from: string, to: string): Promise<void> => {
  try {
    await copyFile(from, to, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error instanceof Error) {
      throw new ConflictError(`Could not copy .env.example: ${error.message}`);
    }

    throw new ConflictError("Could not copy .env.example.");
  }
};

const runRestart = async (
  runtime: AppFixRuntime,
  project: Project
): Promise<boolean> => {
  try {
    await doctorControl(runtime.preview).restart(project);

    return true;
  } catch {
    return false;
  }
};

const toRestart = (runtime: AppFixRuntime, project: Project): void => {
  void runRestart(runtime, project);
};

const toReattachedUrl = (project: Project, patch: AppPatch): string | null => {
  if (patch.url !== null) {
    return patch.url;
  }

  if (project.app?.mode === "url") {
    return project.app.url ?? null;
  }

  return null;
};

const applyAppPatch = async (
  runtime: AppFixRuntime,
  project: Project,
  patch: AppPatch
): Promise<void> => {
  const { app } = project;
  const folder = project.imported?.sourcePath;

  if (!app || !folder) {
    throw new BadRequestError("project is not an attached app");
  }

  const url = toReattachedUrl(project, patch);
  const env = { ...(patch.env ?? app.env) };
  const target: AttachAppRequest = { appDir: app.appDir, env, folder };

  if (url !== null) {
    target.url = url;
  }

  const updated = await runtime.projects.attachApp(target);

  const apps = doctorControl(runtime.preview);

  apps.forget(updated.id);
  toRestart(runtime, updated);
};

const toNoFixMessage = (cause: DoctorCause): string => {
  if (cause.command) {
    return `The ${cause.kind} problem has no one-click fix. Run ${cause.command}.`;
  }

  return `The ${cause.kind} problem has no one-click fix. ${cause.detail}`;
};

const applyCauseFix = async (
  runtime: AppFixRuntime,
  project: Project,
  cause: DoctorCause
): Promise<string> => {
  const { fix } = cause;

  if (!fix) {
    throw new BadRequestError(toNoFixMessage(cause));
  }

  if (fix.kind === "set-env") {
    await applyAppPatch(runtime, project, {
      env: { ...project.app?.env, ...fix.env },
      url: null,
    });

    return `Set ${Object.keys(fix.env).join(", ")} for next dev. The dev server restarts.`;
  }

  if (fix.kind === "copy-env-example") {
    await applyEnvExample(fix.from, fix.to);
    toRestart(runtime, project);

    return "Copied .env.example to .env.local with its example values. Put real values in it yourself. The dev server restarts.";
  }

  if (fix.kind === "use-url") {
    await applyAppPatch(runtime, project, { env: null, url: fix.url });

    return `The studio now uses the dev server at ${fix.url}.`;
  }

  toRestart(runtime, project);

  return "The dev server restarts on a free port.";
};

const applyAppFix = async (
  runtime: AppFixRuntime,
  projectId: string,
  kind: DoctorCauseKind
): Promise<AppFixResult> => {
  const project = await appProject(runtime.projects, projectId);
  const doctor = await doctorControl(runtime.preview).doctor(project, false);
  const cause = doctor.causes.find((item) => item.kind === kind);

  if (!cause) {
    throw new ConflictError(
      `The doctor does not see a ${kind} problem now. Read app_doctor again.`
    );
  }

  return { applied: await applyCauseFix(runtime, project, cause), kind };
};

export { applyAppFix };
