import { mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";

import type { AgentRunner } from "../../shared/server-ports.js";
import type { FrameStateDeps } from "../canvas/app-flow/index.js";
import type { CanvasService } from "../canvas/index.js";
import { warmKit } from "../components/props-service.js";
import type { EditHistory } from "../direct-edit/commit/index.js";
import type { EditRecorder } from "../direct-edit/index.js";
import type { EventBus } from "../events/index.js";
import type { ExportDeps } from "../export/source.js";
import { EditError } from "../page-probe/index.js";
import { isPathLocked } from "../platform/path-lock/index.js";
import {
  LOCAL_ORG_ID,
  isOrgInScope,
  getFileLocks,
  toOrgScope,
} from "../store/index.js";
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
  trustedFolders(): Promise<readonly string[]>;
  saveFirstVersion(project: Project): Promise<Project>;
  history?: EditRecorder & Partial<Pick<EditHistory, "mark" | "dropUnsaved">>;
  keepVariant: KeepVariant;
  layerLocks: LayerLockStore | null;
}

export { EditError } from "../page-probe/index.js";

const MS_PER_MINUTE = 60_000;

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

export const LOCKED_MESSAGE =
  "This file is locked. Unlock it in Code to let Claude change it.";

export async function runLockedPathGuard(
  deps: Pick<EditDeps, "projects">,
  project: Project,
  direction: Direction,
  relative: string
): Promise<void> {
  const globs = await getFileLocks(
    deps.projects.projectDir(project.id),
    direction.id
  );

  if (isPathLocked(globs, relative)) {
    throw new EditError(LOCKED_MESSAGE, "forbidden");
  }
}

export async function approve(deps: EditDeps, ask: ApprovalAsk): Promise<void> {
  const outcome = await deps.approvals.ask(ask);

  if (outcome === "allow") {
    return;
  }

  if (outcome === "closed") {
    throw new EditError(
      "Design Studio is not open, so nobody can answer the approval card. Open Design Studio, then call again."
    );
  }

  if (outcome === "timeout") {
    throw new EditError(
      `Nobody answered the approval card in ${APPROVAL_TIMEOUT_MS / MS_PER_MINUTE} minutes, so it was refused. Ask the user to answer the card in Design Studio, then call again.`
    );
  }

  throw new EditError("The user denied this write in Design Studio.");
}

const toRealRoot = async (root: string): Promise<string> => {
  try {
    return await realpath(root);
  } catch {
    return path.resolve(root);
  }
};

const toTrustRoots = async (
  deps: Pick<EditDeps, "trustedFolders">
): Promise<readonly string[]> => {
  try {
    return await deps.trustedFolders();
  } catch {
    return [];
  }
};

export const isTrustedFolder = async (
  deps: Pick<EditDeps, "trustedFolders">,
  folder: string
): Promise<boolean> => {
  const roots = await toTrustRoots(deps);
  const real = await Promise.all(roots.map((root) => toRealRoot(root)));

  return real.some((root) => isInside(folder, root));
};

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
      (projects !== null && isInside(folder, projects)) ||
      (await isTrustedFolder(deps, folder)),
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
