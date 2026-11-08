import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  CaptureUnavailableError,
  getFfmpeg,
} from "../../state-styles/index.js";
import type { CapturedFrame } from "./flow-capture.js";

type FlowFormat = "gif" | "mp4" | "webm";

interface EncodeJob {
  readonly format: FlowFormat;
  readonly frames: readonly CapturedFrame[];
  readonly output: string;
  readonly width: number;
  readonly workDir: string;
}

const run = promisify(execFile);

const SHOWN_ERROR_CHARS = 300;

const FPS = 15;

const GIF_FPS = 12;

const GIF_WIDTH = 960;

const MS_PER_SECOND = 1000;

const LAST_FRAME_MS = 200;

const DURATION_DIGITS = 3;

const toDurations = (frames: readonly CapturedFrame[]): readonly number[] =>
  frames.map((frame, index) => {
    const next = frames[index + 1] ?? null;

    if (next === null) {
      return LAST_FRAME_MS / MS_PER_SECOND;
    }

    return (next.atMs - frame.atMs) / MS_PER_SECOND;
  });

const toConcatText = (frames: readonly CapturedFrame[]): string => {
  const durations = toDurations(frames);

  const lines = frames.map(
    (frame, index) =>
      `file '${frame.file}'\nduration ${durations[index]?.toFixed(DURATION_DIGITS) ?? "0.2"}`
  );

  const last = frames.at(-1) ?? null;

  if (last !== null) {
    lines.push(`file '${last.file}'`);
  }

  return lines.join("\n");
};

const toOutputArgs = (job: EncodeJob): string[] => {
  const scale = `scale=${job.width}:-2:flags=lanczos`;

  if (job.format === "mp4") {
    return [
      "-vf",
      `fps=${FPS},${scale}`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
    ];
  }

  if (job.format === "gif") {
    const width = Math.min(job.width, GIF_WIDTH);

    return [
      "-vf",
      `fps=${GIF_FPS},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`,
    ];
  }

  return [
    "-vf",
    `fps=${FPS},${scale}`,
    "-c:v",
    "libvpx-vp9",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    "0",
    "-crf",
    "34",
    "-deadline",
    "realtime",
    "-cpu-used",
    "8",
  ];
};

const runEncode = async (job: EncodeJob): Promise<void> => {
  const ffmpeg = await getFfmpeg();
  const list = path.join(job.workDir, "frames.txt");

  await writeFile(list, toConcatText(job.frames));

  const args = [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    ...toOutputArgs(job),
    job.output,
  ];

  try {
    await run(ffmpeg, args);
  } catch (error) {
    throw new CaptureUnavailableError(
      `ffmpeg could not make the ${job.format} file: ${String(error).slice(0, SHOWN_ERROR_CHARS)}`
    );
  }
};

export { runEncode };

export type { EncodeJob, FlowFormat };
