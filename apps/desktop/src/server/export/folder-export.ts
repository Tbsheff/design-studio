import path from "node:path";

import type { Input } from "../../shared/actions/_core/action.js";
import type { ApprovalCard } from "../../shared/actions/_core/approval-card.js";
import type { exportFolderExport } from "../../shared/actions/export/export-folder.js";
import type { exportFrameExport } from "../../shared/actions/export/export-frame.js";
import type {
  FolderExportResult,
  FrameExportResult,
} from "../../shared/actions/export/schema.js";
import type { CanvasFileFrame } from "../../shared/actions/_core/canvas-file.js";
import type { Direction, Project } from "../../shared/actions/_core/contracts.js";
import type { ExportFrame } from "../../shared/actions/_core/export.js";
import { EditError } from "../page-probe/index.js";
import type { ExportRuntime } from "./export-core.js";
import { buildExportFile } from "./export-file.js";
import { pickExportFrames } from "./export-frames.js";
import { readHandoffZip, runHandoff } from "./export-runs.js";
import {
  resolveExportTarget,
  toExportsFolder,
  writeUnique,
} from "./export-write.js";
import { resolveFrameSelector } from "./frame-selector.js";

interface ExportTargetQuery {
  readonly directionId?: string | null;
  readonly projectId: string;
  readonly versionId?: string | null;
}

type FolderQuery = Input<typeof exportFolderExport>;

type FrameQuery = Input<typeof exportFrameExport>;

type FrameInput = NonNullable<FolderQuery["frames"]>[number];

interface NoteField {
  readonly note?: string;
}

interface LoadedTarget {
  readonly direction: Direction;
  readonly project: Project;
  readonly versionId: string;
}

const PROMPT_MAX = 2000;
const FOLDER_TEXT_MAX = 160;
const LINE_MAX = 80;

const toLine = (text: string, max = LINE_MAX): string => {
  const line = text.replaceAll(/\s+/gu, " ").trim();

  if (line.length > max) {
    return `${line.slice(0, max - 1)}…`;
  }

  return line;
};

const toNoteField = (note: string | null): NoteField => {
  if (note) {
    return { note };
  }

  return {};
};

const findDirection = (
  project: Project,
  directionId: string | null
): Direction | null => {
  if (directionId !== null) {
    return (
      project.directions.find((direction) => direction.id === directionId) ??
      null
    );
  }

  return (
    project.directions.find((direction) => direction.id === "main") ??
    project.directions[0] ??
    null
  );
};

const loadExportTarget = async (
  runtime: ExportRuntime,
  query: ExportTargetQuery
): Promise<LoadedTarget> => {
  const project = await runtime.projects.get(query.projectId);

  if (project.designSystemFor && project.designSystemDeleted) {
    throw new EditError("project not found");
  }

  const direction = findDirection(project, query.directionId ?? null);

  if (direction === null) {
    throw new EditError(
      `direction ${query.directionId ?? "main"} not found in project ${project.id}`
    );
  }

  const versionId = query.versionId ?? direction.headVersionId;

  if (!versionId) {
    throw new EditError("This direction has no saved version yet.");
  }

  return { direction, project, versionId };
};

const toFrameInput = (frame: FrameInput): ExportFrame => {
  const out: ExportFrame = {
    height: frame.height,
    name: frame.name?.trim() || `${frame.width}x${frame.height}`,
    width: frame.width,
  };

  if (frame.path) {
    out.path = frame.path;
  }

  return out;
};

const toFolderCard = async (
  runtime: ExportRuntime,
  query: FolderQuery
): Promise<ApprovalCard> => {
  const project = await runtime.projects.get(query.projectId);

  const target = await resolveExportTarget(
    runtime,
    project.id,
    query.folder ?? null
  );

  const format = query.format.toUpperCase();

  return {
    action: "Export to a folder",
    detail: `${toLine(project.name)}. Writes the ${format} file to ${toLine(target.folder, FOLDER_TEXT_MAX)}.`,
    title: `Export ${format} to ${toLine(target.folder, FOLDER_TEXT_MAX)}`,
  };
};

const exportHandoffTo = async (
  runtime: ExportRuntime,
  query: FolderQuery,
  folder: string,
  versionId: string
): Promise<FolderExportResult> => {
  const handoff = await runHandoff(runtime, {
    frames: query.frames?.map((frame) => toFrameInput(frame)) ?? null,
    projectId: query.projectId,
    versionId,
  });

  const zip = await readHandoffZip(
    runtime,
    query.projectId,
    path.basename(handoff.path)
  );

  const file = await writeUnique(
    folder,
    zip.name,
    Buffer.from(zip.content, "base64")
  );

  return {
    files: [file],
    handoffFiles: handoff.files.length,
    prompt: handoff.prompt.slice(0, PROMPT_MAX),
    versionId,
  };
};

const runFolderExport = async (
  runtime: ExportRuntime,
  query: FolderQuery
): Promise<FolderExportResult> => {
  const target = await loadExportTarget(runtime, query);

  const { folder } = await resolveExportTarget(
    runtime,
    target.project.id,
    query.folder ?? null
  );

  if (query.format === "handoff") {
    return exportHandoffTo(runtime, query, folder, target.versionId);
  }

  const out = await buildExportFile(runtime, {
    format: query.format,
    frames: query.frames?.map((frame) => toFrameInput(frame)) ?? null,
    projectId: target.project.id,
    scale: query.scale ?? 1,
    scope: "page",
    selector: null,
    versionId: target.versionId,
  });

  const file = await writeUnique(folder, out.name, out.bytes);

  return {
    bytes: out.bytes.byteLength,
    files: [file],
    versionId: target.versionId,
    ...toNoteField(out.note),
  };
};

const readCanvasFrames = async (
  runtime: ExportRuntime,
  project: Project
): Promise<readonly CanvasFileFrame[]> => {
  if (runtime.canvas === null) {
    return [];
  }

  const snapshot = await runtime.canvas.read(project);

  return snapshot.canvas?.frames ?? [];
};

const pickFrames = async (
  runtime: ExportRuntime,
  target: LoadedTarget,
  query: FrameQuery
): Promise<ExportFrame[]> => {
  const all = await readCanvasFrames(runtime, target.project);

  const pick = pickExportFrames(all, target.direction.id, query.frames ?? null);

  if (!pick.ok) {
    throw new EditError(pick.message);
  }

  if (query.selector) {
    return pick.frames.slice(0, 1);
  }

  return pick.frames;
};

const runFrameExport = async (
  runtime: ExportRuntime,
  query: FrameQuery
): Promise<FrameExportResult> => {
  if (query.selector && query.format === "pptx") {
    throw new EditError("selector works with format svg only.");
  }

  const target = await loadExportTarget(runtime, query);
  const picked = await pickFrames(runtime, target, query);

  const cssSelector = await resolveFrameSelector(runtime, {
    direction: target.direction,
    frame: picked[0] ?? null,
    project: target.project,
    raw: query.selector ?? null,
  });

  const out = await buildExportFile(runtime, {
    format: query.format,
    frames: picked,
    projectId: target.project.id,
    scale: 1,
    scope: query.area ?? "frame",
    selector: cssSelector,
    versionId: target.versionId,
  });

  const written = await writeUnique(
    toExportsFolder(runtime, target.project.id),
    out.name,
    out.bytes
  );

  return {
    bytes: out.bytes.byteLength,
    file: written,
    format: query.format,
    frames: picked.map((frame) => frame.name),
    versionId: target.versionId,
    ...toNoteField(out.note),
  };
};

export { runFolderExport, runFrameExport, toFolderCard };

export type { FolderQuery, FrameQuery };
