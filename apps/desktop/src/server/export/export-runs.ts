import path from "node:path";

import type {
  ExportFileResult,
  HandoffFolderResult,
} from "../../shared/actions/export/schema.js";
import type { ExportFrame } from "../../shared/actions/_core/export.js";
import type { ExportRuntime } from "./export-core.js";
import { buildExportFile } from "./export-file.js";
import type { ExportedBytes, FileRequest } from "./export-file.js";
import { parseFrames, resolveSource } from "./source.js";

interface HandoffRequest {
  readonly frames: readonly ExportFrame[] | null;
  readonly projectId: string;
  readonly versionId: string;
}

const HANDOFF_FRAMES: ExportFrame[] = [
  { height: 900, name: "Desktop", width: 1440 },
  { height: 844, name: "Mobile", width: 390 },
];

const toFileResult = (out: ExportedBytes): ExportFileResult => ({
  content: Buffer.from(out.bytes).toString("base64"),
  name: out.name.replaceAll('"', ""),
  note: out.note,
  type: out.type,
});

const runFileExport = async (
  runtime: ExportRuntime,
  request: FileRequest
): Promise<ExportFileResult> =>
  toFileResult(await buildExportFile(runtime, request));

const toHandoffFrames = (
  frames: readonly ExportFrame[] | null
): ExportFrame[] => {
  if (frames === null || frames.length === 0) {
    return HANDOFF_FRAMES;
  }

  return parseFrames(frames);
};

const runHandoff = async (
  runtime: ExportRuntime,
  request: HandoffRequest
): Promise<HandoffFolderResult> => {
  const [{ buildHandoff }, source] = await Promise.all([
    import("./handoff.js"),
    resolveSource(runtime, request.projectId, request.versionId),
  ]);

  const history = await runtime.versions.list(source.project, source.direction);

  return buildHandoff(runtime, {
    frames: toHandoffFrames(request.frames),
    history,
    source,
  });
};

const readHandoffZip = async (
  runtime: ExportRuntime,
  projectId: string,
  folder: string
): Promise<ExportFileResult> => {
  const { zipHandoff } = await import("./handoff.js");
  const zip = await zipHandoff(runtime, projectId, path.basename(folder));

  return toFileResult({
    bytes: zip.bytes,
    name: zip.name,
    note: null,
    type: "application/zip",
  });
};

export { readHandoffZip, runFileExport, runHandoff };

export type { HandoffRequest };
