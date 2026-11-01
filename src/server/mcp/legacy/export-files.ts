import path from "node:path";

import type { Direction, Project, Version } from "../../../shared/contracts.js";
import type { HandoffResult } from "../../../shared/export.js";
import type { ActivityDraft } from "../activity.js";
import {
  approve,
  EditError,
  exportFolder,
  loadTarget,
  oneLine,
  short,
  studioCall,
  studioFile,
  writeUnique,
} from "../edit-deps.js";
import type { EditDeps } from "../edit-deps.js";
import { ok } from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import type { ExportInput } from "./export-schema.js";

interface ExportFrame {
  height: number;
  name: string;
  path?: string;
  width: number;
}

interface ExportRun {
  deps: EditDeps;
  direction: Direction;
  folder: string;
  format: string;
  frames: ExportFrame[] | null;
  input: ExportInput;
  project: Project;
  version: Version;
}

interface FileResult {
  bytes: number;
  files: string[];
  note?: string;
  versionId: string;
}

interface HandoffBody {
  frames?: ExportFrame[];
  versionId: string;
}

const FILE_TEXT_MAX = 120;
const FOLDER_TEXT_MAX = 160;
const PROMPT_MAX = 2000;

const exportFrameOf = (
  frame: NonNullable<ExportInput["frames"]>[number]
): ExportFrame => {
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

const exportFramesOf = (input: ExportInput): ExportFrame[] | null =>
  input.frames?.map(exportFrameOf) ?? null;

const exported = (run: ExportRun, file: string): ActivityDraft => ({
  directionId: run.direction.id,
  projectId: run.project.id,
  summary: `Exported ${run.format} to ${oneLine(file, FILE_TEXT_MAX)}`,
});

const projectPath = (run: ExportRun): string =>
  `/api/projects/${encodeURIComponent(run.project.id)}`;

const handoffBody = (run: ExportRun): HandoffBody => {
  const body: HandoffBody = { versionId: run.version.id };

  if (run.frames) {
    body.frames = run.frames;
  }

  return body;
};

const exportHandoff = async (run: ExportRun): Promise<Done> => {
  const handoff = await studioCall<HandoffResult>(
    run.deps,
    "POST",
    `${projectPath(run)}/handoff`,
    handoffBody(run)
  );

  const zip = await studioFile(
    run.deps,
    "GET",
    `${projectPath(run)}/handoff/${encodeURIComponent(path.basename(handoff.path))}/zip`
  );

  const file = await writeUnique(run.folder, zip.name, zip.bytes);

  return {
    activity: exported(run, file),
    result: ok({
      files: [file],
      handoffFiles: handoff.files.length,
      prompt: short(handoff.prompt, PROMPT_MAX),
      versionId: run.version.id,
    }),
  };
};

const exportFile = async (run: ExportRun): Promise<Done> => {
  const output = await studioFile(
    run.deps,
    "POST",
    `${projectPath(run)}/export`,
    {
      format: run.input.format,
      frames: run.frames ?? [],
      scale: run.input.scale,
      scope: "page",
      versionId: run.version.id,
    }
  );

  const file = await writeUnique(run.folder, output.name, output.bytes);

  const result: FileResult = {
    bytes: output.bytes.byteLength,
    files: [file],
    versionId: run.version.id,
  };

  if (output.note) {
    result.note = output.note;
  }

  return { activity: exported(run, file), result: ok(result) };
};

const exportVersion = (
  deps: EditDeps,
  project: Project,
  versionId: string | null
): Promise<Version> => {
  if (!versionId) {
    return Promise.reject(
      new EditError("This direction has no saved version yet.")
    );
  }

  return deps.versions.get(project, versionId);
};

const askForFolder = async (
  deps: EditDeps,
  project: Project,
  ask: { folder: string; format: string; who: string }
): Promise<void> => {
  await approve(deps, {
    action: "Export to a folder outside Downloads and the projects folder",
    client: ask.who,
    detail: `${oneLine(project.name)}. This folder is outside Downloads and the projects folder.`,
    projectId: project.id,
    title: `${ask.who} wants to export ${ask.format} to ${oneLine(ask.folder, FOLDER_TEXT_MAX)}`,
    tool: "export",
  });
};

const exportFiles = async (
  deps: EditDeps,
  input: ExportInput,
  client: string
): Promise<Done> => {
  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const version = await exportVersion(
    deps,
    project,
    input.versionId ?? direction.headVersionId
  );

  const target = exportFolder(deps, project.id, input.folder);

  const { folder, trusted } = await target;

  const format = input.format.toUpperCase();

  if (!trusted) {
    await askForFolder(deps, project, { folder, format, who: client });
  }

  const frames = exportFramesOf(input);

  const run: ExportRun = {
    deps,
    direction,
    folder,
    format,
    frames,
    input,
    project,
    version,
  };

  if (input.format === "handoff") {
    return exportHandoff(run);
  }

  return exportFile(run);
};

export { exportFiles };
