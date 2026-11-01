import { randomBytes } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

type AtomicWriteCleanup = "none" | "rename" | "always";

interface AtomicWriteOptions {
  readonly cleanup?: AtomicWriteCleanup;
  readonly createDir?: boolean;
  readonly hiddenTemp?: boolean;
  readonly keepMode?: boolean;
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

const writeTemp = async (
  temp: string,
  file: string,
  content: string,
  keepMode: boolean
): Promise<void> => {
  if (!keepMode) {
    await writeFile(temp, content);

    return;
  }

  const { mode } = await stat(file);

  await writeFile(temp, content, { mode });
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
    keepMode = false,
  } = options;

  if (createDir) {
    await mkdir(path.dirname(file), { recursive: true });
  }

  const temp = tempPathFor(file, hiddenTemp);

  await runStep(
    () => writeTemp(temp, file, content, keepMode),
    temp,
    cleanup === "always"
  );
  await runStep(() => rename(temp, file), temp, cleanup !== "none");
};

export { writeAtomic };

export type { AtomicWriteCleanup, AtomicWriteOptions };
