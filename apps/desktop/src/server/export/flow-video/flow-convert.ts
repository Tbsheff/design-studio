import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  CaptureUnavailableError,
  getFfmpeg,
} from "../../state-styles/index.js";

type ConvertedFormat = "gif" | "mp4";

const run = promisify(execFile);

const SHOWN_ERROR_CHARS = 300;

const GIF_FPS = 12;

const GIF_WIDTH = 960;

const toArgs = (
  format: ConvertedFormat,
  input: string,
  output: string
): string[] => {
  if (format === "mp4") {
    return [
      "-y",
      "-loglevel",
      "error",
      "-i",
      input,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-movflags",
      "+faststart",
      output,
    ];
  }

  return [
    "-y",
    "-loglevel",
    "error",
    "-i",
    input,
    "-vf",
    `fps=${GIF_FPS},scale='min(${GIF_WIDTH},iw)':-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`,
    output,
  ];
};

const runConversion = async (
  format: ConvertedFormat,
  input: string,
  output: string
): Promise<void> => {
  const ffmpeg = await getFfmpeg();

  try {
    await run(ffmpeg, toArgs(format, input, output));
  } catch (error) {
    const text = String(error);

    throw new CaptureUnavailableError(
      `ffmpeg could not make the ${format} file: ${text.slice(0, SHOWN_ERROR_CHARS)}`
    );
  }
};

export { runConversion };

export type { ConvertedFormat };
