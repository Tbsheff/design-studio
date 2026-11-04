import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { CaptureUnavailableError } from "./animation-unavailable.js";

interface Encoder {
  readonly finish: () => Promise<void>;
  readonly push: (frame: Buffer) => Promise<void>;
}

const run = promisify(execFile);

const CANDIDATES = [
  "ffmpeg",
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/usr/bin/ffmpeg",
];

const SHOWN_ERROR_CHARS = 300;

const NO_FFMPEG =
  "ffmpeg was not found. Install ffmpeg (for example brew install ffmpeg) to export webm.";

const canRun = async (command: string): Promise<boolean> => {
  try {
    await run(command, ["-version"]);

    return true;
  } catch {
    return false;
  }
};

const getFfmpeg = async (): Promise<string> => {
  const checks = await Promise.all(
    CANDIDATES.map(async (command) => ({
      command,
      isFound: await canRun(command),
    }))
  );

  const found = checks.find((check) => check.isFound);

  if (!found) {
    throw new CaptureUnavailableError(NO_FFMPEG);
  }

  return found.command;
};

const toArgs = (fps: number, out: string): string[] => [
  "-y",
  "-loglevel",
  "error",
  "-f",
  "image2pipe",
  "-framerate",
  String(fps),
  "-i",
  "-",
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
  out,
];

const startEncoder = async (
  ffmpeg: string,
  fps: number,
  out: string
): Promise<Encoder> => {
  await mkdir(path.dirname(out), { recursive: true });

  const child = spawn(ffmpeg, toArgs(fps, out), {
    stdio: ["pipe", "ignore", "pipe"],
  });

  const errors: string[] = [];

  child.stderr.on("data", (chunk: Buffer) => errors.push(chunk.toString()));
  child.stdin.on("error", (error) => errors.push(error.message));
  child.on("error", (error) => errors.push(error.message));

  const push = async (frame: Buffer): Promise<void> => {
    if (!child.stdin.write(frame)) {
      await once(child.stdin, "drain");
    }
  };

  const finish = async (): Promise<void> => {
    child.stdin.end();

    const [code] = await once(child, "close");

    if (code !== 0) {
      throw new CaptureUnavailableError(
        `ffmpeg could not encode the video: ${errors.join(" ").slice(0, SHOWN_ERROR_CHARS)}`
      );
    }
  };

  return { finish, push };
};

export { getFfmpeg, startEncoder };

export type { Encoder };
