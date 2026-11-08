import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";

import type { FixApp } from "../../shared/mcp-ports.js";
import type { AgentRunner } from "../../shared/server-ports.js";
import type { FrameStateDeps } from "../canvas/app-flow/index.js";
import type { CanvasService } from "../canvas/index.js";
import { warmKit } from "../components/props-service.js";
import type { EditHistory } from "../direct-edit/commit/index.js";
import type { EditRecorder } from "../direct-edit/index.js";
import type { EventBus } from "../events/index.js";
import type { ExportDeps } from "../export/source.js";
import { EditError } from "../page-probe/index.js";
import { LOCAL_ORG_ID, isOrgInScope, toOrgScope } from "../store/index.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import type { KeepVariant } from "../variations/routes.js";
import type { ActivityLog } from "./activity.js";
import { APPROVAL_TIMEOUT_MS } from "./approvals.js";
import type { ApprovalAsk, ApprovalQueue } from "./approvals.js";
import { downloadsFolder, isInside, safeFolder } from "./folders.js";
import { legacyCaller, lookupProjectOrg } from "./legacy/caller-scope.js";

export interface EditDeps extends ExportDeps {
  runner: AgentRunner;
  canvas: CanvasService;
  frameStates: FrameStateDeps;
  bus: EventBus;
  approvals: ApprovalQueue;
  activity: ActivityLog;
  dataDir: string;
  projectsFolder(): Promise<string>;
  history?: EditRecorder & Partial<Pick<EditHistory, "mark" | "dropUnsaved">>;
  fixApp: FixApp;
  keepVariant: KeepVariant;
  layerLocks: LayerLockStore | null;
}

export { EditError } from "../page-probe/index.js";

export const RUN_BUSY =
  "A studio run is editing this design. Try again when it finishes.";

const requireProjectInScope = async (projectId: string): Promise<void> => {
  const orgId = (await lookupProjectOrg(projectId)) ?? LOCAL_ORG_ID;

  if (!isOrgInScope(toOrgScope(legacyCaller()), orgId)) {
    throw new EditError(
      "404 not found: the project does not exist.",
      "not_found"
    );
  }
};

export async function loadTarget(
  deps: Pick<ExportDeps, "projects">,
  projectId: string,
  directionId?: string
): Promise<{ project: Project; direction: Direction }> {
  await requireProjectInScope(projectId);

  const project = await deps.projects.get(projectId);

  if (project.designSystemFor && project.designSystemDeleted) {
    throw new EditError("project not found");
  }

  const direction = directionId
    ? project.directions.find((d) => d.id === directionId)
    : (project.directions.find((d) => d.id === "main") ??
      project.directions[0]);

  if (!direction) {
    throw new EditError(
      `direction ${directionId ?? "main"} not found in project ${project.id}`
    );
  }

  warmKit(project, direction);

  return { project, direction };
}

export function refuseWhileRunning(
  deps: EditDeps,
  project: Project,
  direction: Direction
): void {
  if (deps.runner.isRunning(project.id, direction.id)) {
    throw new EditError(RUN_BUSY);
  }
}

export async function approve(deps: EditDeps, ask: ApprovalAsk): Promise<void> {
  const outcome = await deps.approvals.ask(ask);

  if (outcome === "allow") {
    return;
  }

  if (outcome === "closed") {
    throw new EditError(
      "Design Studio is not open, so nobody can approve this write. Open the Design Studio window, or write to ~/Downloads or the projects folder."
    );
  }

  if (outcome === "timeout") {
    throw new EditError(
      `Nobody answered the approval prompt in Design Studio within ${APPROVAL_TIMEOUT_MS / 1000} seconds, so it was refused. Ask the user to watch for the prompt, then call the tool again.`
    );
  }

  throw new EditError("The user denied this write in Design Studio.");
}

export async function outputFolder(
  deps: EditDeps,
  raw: unknown
): Promise<{ folder: string; trusted: boolean }> {
  const downloads = await downloadsFolder();

  const folder = await safeFolder(
    raw === undefined ? downloads : raw,
    deps.dataDir
  );

  const projects = await safeFolder(
    await deps.projectsFolder(),
    deps.dataDir
  ).catch(() => null);

  return {
    folder,
    trusted:
      isInside(folder, downloads) ||
      (projects !== null && isInside(folder, projects)),
  };
}

export async function exportFolder(
  deps: EditDeps,
  projectId: string,
  raw: unknown
): Promise<{ folder: string; trusted: boolean }> {
  if (raw !== undefined) {
    return outputFolder(deps, raw);
  }

  const folder = path.join(deps.dataDir, "exports", projectId);
  await mkdir(folder, { recursive: true });

  return { folder, trusted: true };
}

export async function writeUnique(
  folder: string,
  name: string,
  bytes: Uint8Array
): Promise<string> {
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length) || "export";

  for (let n = 1; n < 1000; n += 1) {
    const target = path.join(
      folder,
      n === 1 ? `${stem}${ext}` : `${stem}-${n}${ext}`
    );

    try {
      await writeFile(target, bytes, { flag: "wx" });

      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }

  throw new EditError(`no free file name for ${name} in ${folder}`);
}

export function short(text: string, max = 4000): string {
  return text.length > max
    ? `${text.slice(0, max)}\n[cut at ${max} characters]`
    : text;
}

export function oneLine(text: string, max = 80): string {
  const flat = text.replaceAll(/\s+/g, " ").trim();

  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export type { FixApp };
