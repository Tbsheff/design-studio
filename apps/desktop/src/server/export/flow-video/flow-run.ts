import { copyFile, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FlowVideoResult } from "@design-studio/actions/canvas/schema";

import { BadRequestError } from "../../platform/errors/index.js";
import {
  CaptureUnavailableError,
  getFfmpeg,
} from "../../state-styles/index.js";
import type { ExportRuntime } from "../export-core.js";
import { runEncode } from "./flow-convert.js";
import { getFlowTarget } from "./flow-load.js";
import type { FlowRequest, FlowTarget } from "./flow-load.js";
import { getPlan, toInputHash } from "./flow-plan.js";
import type { FlowPlan } from "./flow-plan.js";
import { runRecording } from "./flow-record.js";
import type { Recorded } from "./flow-record.js";

const MEDIA_TYPES = {
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
} as const;

const MIN_STEPS = 2;

const NO_CLICK =
  "No link from the start frame could be clicked. The linked elements are not on the page.";

const NO_VIDEO = "The recording has no frames. Try again.";

const hasFfmpeg = async (): Promise<boolean> => {
  try {
    await getFfmpeg();

    return true;
  } catch {
    return false;
  }
};

const runOutput = async (
  request: FlowRequest,
  recorded: Recorded,
  paths: { readonly out: string; readonly workDir: string }
): Promise<void> => {
  if (recorded.nativePath !== null) {
    await copyFile(recorded.nativePath, paths.out);

    return;
  }

  if (recorded.frames.length === 0) {
    throw new CaptureUnavailableError(NO_VIDEO);
  }

  await runEncode({
    format: request.format,
    frames: recorded.frames,
    output: paths.out,
    width: recorded.size.width,
    workDir: paths.workDir,
  });
};

interface OutputJob {
  readonly plan: FlowPlan;
  readonly recorded: Recorded;
  readonly request: FlowRequest;
  readonly target: FlowTarget;
  readonly workDir: string;
}

const createOutput = async (
  job: OutputJob
): Promise<{ readonly bytes: number; readonly out: string }> => {
  const { plan, recorded, request, target, workDir } = job;
  const folder = path.join(target.projectDir, "studio", "exports");

  await mkdir(folder, { recursive: true });

  const out = path.join(
    folder,
    `flow-${toInputHash(request, target, plan)}.${request.format}`
  );

  await runOutput(request, recorded, { out, workDir });

  const written = await stat(out);

  return { bytes: written.size, out };
};

const runFlowVideo = async (
  runtime: ExportRuntime,
  request: FlowRequest
): Promise<FlowVideoResult> => {
  const target = await getFlowTarget(runtime, request);
  const plan = getPlan(target, request);
  const isNative = !(await hasFfmpeg());

  if (isNative && request.format !== "webm") {
    await getFfmpeg();
  }

  const workDir = await mkdtemp(path.join(os.tmpdir(), "studio-flow-"));

  try {
    const recorded = await runRecording({
      isNative,
      plan,
      request,
      target,
      workDir,
    });

    if (recorded.state.steps.length < MIN_STEPS) {
      throw new BadRequestError(NO_CLICK);
    }

    const written = await createOutput({
      plan,
      recorded,
      request,
      target,
      workDir,
    });

    return {
      brokenLinks: recorded.state.broken,
      bytes: written.bytes,
      durationMs: recorded.state.steps.length * request.stepMs,
      mediaType: MEDIA_TYPES[request.format],
      path: written.out,
      steps: recorded.state.steps,
    };
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
};

export { runFlowVideo };
