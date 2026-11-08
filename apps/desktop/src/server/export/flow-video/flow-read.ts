import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Input } from "@design-studio/actions/_core/action";
import type { getFlowVideoCanvas } from "@design-studio/actions/canvas/get-flow-video";

import { NotFoundError } from "../../platform/errors/index.js";
import type { ExportRuntime } from "../export-core.js";
import type { FlowFormat } from "./flow-convert.js";

type FlowReadRequest = Input<typeof getFlowVideoCanvas>;

interface FlowVideoFile {
  readonly content: string;
  readonly name: string;
  readonly type: string;
}

const TYPES: Readonly<Record<FlowFormat, string>> = {
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
};

const toFormat = (name: string): FlowFormat => {
  if (name.endsWith(".gif")) {
    return "gif";
  }

  if (name.endsWith(".mp4")) {
    return "mp4";
  }

  return "webm";
};

const runFlowRead = async (
  runtime: ExportRuntime,
  request: FlowReadRequest
): Promise<FlowVideoFile> => {
  const folder = path.join(
    runtime.projects.projectDir(request.projectId),
    "studio",
    "exports"
  );

  try {
    const bytes = await readFile(path.join(folder, request.file));

    return {
      content: bytes.toString("base64"),
      name: request.file,
      type: TYPES[toFormat(request.file)],
    };
  } catch {
    throw new NotFoundError(`${request.file} was not found. Export it again.`);
  }
};

export { runFlowRead };

export type { FlowReadRequest, FlowVideoFile };
