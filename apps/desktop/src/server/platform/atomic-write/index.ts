import { randomBytes } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { Effect } from "effect";

type AtomicWriteCleanup = "none" | "rename" | "always";

interface AtomicWriteOptions {
  readonly cleanup?: AtomicWriteCleanup;
  readonly createDir?: boolean;
  readonly hiddenTemp?: boolean;
  readonly keepMode?: boolean;
  readonly mode?: number;
}

const TEMP_SUFFIX_BYTES = 4;

const tempPathFor = (file: string, hidden: boolean): string => {
  const suffix = randomBytes(TEMP_SUFFIX_BYTES).toString("hex");

  if (!hidden) {
    return `${file}.${suffix}.tmp`;
  }

  return path.join(
    path.dirname(file),
    `.${path.basename(file)}.studio-${suffix}.tmp`
  );
};

interface TempWrite {
  readonly content: string;
  readonly file: string;
  readonly fileMode: number | null;
  readonly isKeepMode: boolean;
  readonly temp: string;
}

const DEFAULT_FILE_MODE = 0o666;

const writeTemp = async (write: TempWrite): Promise<void> => {
  if (write.isKeepMode && write.fileMode === null) {
    const { mode } = await stat(write.file);

    await writeFile(write.temp, write.content, { mode });

    return;
  }

  await writeFile(write.temp, write.content, {
    mode: write.fileMode ?? DEFAULT_FILE_MODE,
  });
};

const runStep = async (
  step: () => Promise<void>,
  temp: string,
  clean: boolean
): Promise<void> => {
  try {
    await step();
  } catch (error) {
    if (clean) {
      await rm(temp, { force: true });
    }

    throw error;
  }
};

const writeAtomic = async (
  file: string,
  content: string,
  options: AtomicWriteOptions = {}
): Promise<void> => {
  const {
    cleanup = "none",
    createDir = false,
    hiddenTemp = false,
    keepMode: isKeepMode = false,
    mode: fileMode = null,
  } = options;

  if (createDir) {
    await mkdir(path.dirname(file), { recursive: true });
  }

  const temp = tempPathFor(file, hiddenTemp);

  await runStep(
    () => writeTemp({ content, file, fileMode, isKeepMode, temp }),
    temp,
    cleanup === "always"
  );
  await runStep(() => rename(temp, file), temp, cleanup !== "none");
};

const PRIVATE_MODE = 0o600;

const setPrivateJson = <Value>(
  file: string,
  value: Value
): Effect.Effect<void> =>
  Effect.promise(() =>
    writeAtomic(file, `${JSON.stringify(value, null, 2)}\n`, {
      cleanup: "always",
      createDir: true,
      mode: PRIVATE_MODE,
    })
  );

export { PRIVATE_MODE, setPrivateJson, writeAtomic };

export type { AtomicWriteCleanup, AtomicWriteOptions };
