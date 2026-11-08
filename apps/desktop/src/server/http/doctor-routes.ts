import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";

import type { Project } from "@design-studio/contracts";
import type {
  AppFixResult,
  DoctorCause,
  DoctorCauseKind,
} from "@design-studio/contracts/app-doctor";
import type { Context, Hono } from "hono";

import type { PreviewService } from "../../shared/server-ports.js";
import { BadRequestError, ConflictError } from "../platform/errors/index.js";
import { appProject, doctorControl } from "../preview/doctor-read.js";
import { bindMcpReadRuntime } from "../preview/mcp-read-core.js";
import type { StudioProjectStore } from "../store/projects.js";

export interface DoctorRouteDeps {
  projects: StudioProjectStore;
  preview: PreviewService;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

const KINDS: DoctorCauseKind[] = [
  "env-validation",
  "missing-env-file",
  "port-in-use",
  "install",
  "auth-redirect",
];

async function reattach(
  deps: DoctorRouteDeps,
  project: Project,
  patch: { env?: Record<string, string>; url?: string }
): Promise<void> {
  const app = project.app;
  const folder = project.imported?.sourcePath;

  if (!app || !folder) {
    throw new BadRequestError("project is not an attached app");
  }

  const url = patch.url ?? (app.mode === "url" ? app.url : undefined);

  const updated = await deps.projects.attachApp({
    folder,
    appDir: app.appDir,
    ...(url ? { url } : {}),
    env: patch.env ?? app.env ?? {},
  });

  const apps = doctorControl(deps.preview);
  apps.forget(updated.id);
  void apps.restart(updated).catch(() => undefined);
}

async function applyFix(
  deps: DoctorRouteDeps,
  project: Project,
  cause: DoctorCause
): Promise<string> {
  const fix = cause.fix;

  if (!fix) {
    throw new BadRequestError(
      `The ${cause.kind} problem has no one-click fix. ${cause.command ? `Run ${cause.command}.` : cause.detail}`
    );
  }

  if (fix.kind === "set-env") {
    await reattach(deps, project, {
      env: { ...project.app?.env, ...fix.env },
    });

    return `Set ${Object.keys(fix.env).join(", ")} for next dev. The dev server restarts.`;
  }

  if (fix.kind === "copy-env-example") {
    await copyFile(fix.from, fix.to, constants.COPYFILE_EXCL).catch(
      (error: unknown) => {
        throw new ConflictError(
          `Could not copy .env.example: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    );
    void doctorControl(deps.preview)
      .restart(project)
      .catch(() => undefined);

    return "Copied .env.example to .env.local with its example values. Put real values in it yourself. The dev server restarts.";
  }

  if (fix.kind === "use-url") {
    await reattach(deps, project, { url: fix.url });

    return `The studio now uses the dev server at ${fix.url}.`;
  }

  void doctorControl(deps.preview)
    .restart(project)
    .catch(() => undefined);

  return "The dev server restarts on a free port.";
}

export async function fixApp(
  deps: DoctorRouteDeps,
  pid: string,
  kind: unknown
): Promise<AppFixResult> {
  if (typeof kind !== "string" || !KINDS.includes(kind as DoctorCauseKind)) {
    throw new BadRequestError(`kind must be one of ${KINDS.join(", ")}`);
  }

  const project = await appProject(deps.projects, pid);
  const doctor = await doctorControl(deps.preview).doctor(project, false);
  const cause = doctor.causes.find((item) => item.kind === kind);

  if (!cause) {
    throw new ConflictError(
      `The doctor does not see a ${kind} problem now. Read app_doctor again.`
    );
  }

  return { kind: cause.kind, applied: await applyFix(deps, project, cause) };
}

export function registerDoctorRoutes(app: Hono, deps: DoctorRouteDeps): void {
  bindMcpReadRuntime({ preview: deps.preview, projects: deps.projects });
  app.post("/api/projects/:pid/app/doctor/fix", async (c) =>
    c.json(
      await fixApp(deps, c.req.param("pid"), (await deps.readBody(c)).kind)
    )
  );
}
