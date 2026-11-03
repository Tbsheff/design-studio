import { randomBytes } from "node:crypto";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { BadRequestError, isNodeError } from "./errors.js";
import { createKeyedMutex } from "./mutex.js";
import { bindDefaultFolderRuntime } from "./workspace-runtime.js";

export {
  DEFAULT_FOLDER_NAME,
  DEV_PROJECTS_FOLDER,
  projectsDirFromEnv,
} from "../platform/config/index.js";

export const PREFERENCES_FILE = "preferences.json";
const MAX_PATH_LENGTH = 4096;

const preferencesSchema = z
  .object({
    onboardingDismissed: z.boolean().optional(),
    projectsDir: z
      .string()
      .min(1)
      .max(MAX_PATH_LENGTH)
      .refine((value) => path.isAbsolute(value), "must be absolute")
      .optional(),
    version: z.literal(1),
  })
  .strict();

type Preferences = z.infer<typeof preferencesSchema>;

export interface DefaultFolderStore {
  current(): Promise<string>;
  ensure(): Promise<string>;
  set(raw: string): Promise<string>;
  onboardingDismissed(): Promise<boolean>;
  dismissOnboarding(): Promise<void>;
}

async function presentPath(target: string): Promise<string> {
  try {
    return await realpath(target);
  } catch {
    return path.resolve(target);
  }
}

export function createDefaultFolderStore(
  dataDir: string,
  fallback: string
): DefaultFolderStore {
  const file = path.join(dataDir, PREFERENCES_FILE);
  const lock = createKeyedMutex();
  const dataRoot = path.resolve(dataDir);

  const insideDataDir = (target: string): boolean =>
    target === dataRoot || target.startsWith(dataRoot + path.sep);

  const read = async (): Promise<Preferences> => {
    let raw: string;

    try {
      raw = await readFile(file, "utf-8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { version: 1 };
      }

      throw error;
    }

    try {
      const parsed = preferencesSchema.safeParse(JSON.parse(raw));

      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      console.error(
        `[preferences] ${file} is not JSON; using the default projects folder`
      );

      return { version: 1 };
    }

    console.error(
      `[preferences] ${file} failed validation; using the default projects folder`
    );

    return { version: 1 };
  };

  const write = async (data: Preferences): Promise<void> => {
    await mkdir(dataDir, { recursive: true });
    const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
    await writeFile(
      temp,
      `${JSON.stringify(preferencesSchema.parse(data), null, 2)}\n`
    );
    await rename(temp, file);
  };

  const configured = async (): Promise<string> =>
    (await read()).projectsDir ?? fallback;

  const resolveFolder = async (raw: string): Promise<string> => {
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new BadRequestError("path is required");
    }

    if (raw.includes("\0") || raw.length > MAX_PATH_LENGTH) {
      throw new BadRequestError("invalid path");
    }

    if (!path.isAbsolute(raw)) {
      throw new BadRequestError("path must be absolute");
    }

    let real: string;

    try {
      real = await realpath(path.resolve(raw));
    } catch {
      throw new BadRequestError(`folder not found: ${raw}`);
    }

    if (!(await stat(real)).isDirectory()) {
      throw new BadRequestError(`not a folder: ${real}`);
    }

    if (insideDataDir(real)) {
      throw new BadRequestError(
        "cannot use a folder inside the studio data dir"
      );
    }

    return real;
  };

  const store: DefaultFolderStore = {
    async current(): Promise<string> {
      return presentPath(await configured());
    },

    dismissOnboarding(): Promise<void> {
      return lock("file", async () =>
        write({ ...(await read()), version: 1, onboardingDismissed: true })
      );
    },

    async ensure(): Promise<string> {
      const target = await configured();

      if (insideDataDir(path.resolve(target))) {
        throw new BadRequestError(
          "the default projects folder cannot be inside the studio data dir"
        );
      }

      await mkdir(target, { recursive: true });

      return realpath(target);
    },

    async onboardingDismissed(): Promise<boolean> {
      return (await read()).onboardingDismissed === true;
    },

    async set(raw: string): Promise<string> {
      const real = await resolveFolder(raw);

      return lock("file", async () => {
        await write({ ...(await read()), version: 1, projectsDir: real });

        return real;
      });
    },
  };

  bindDefaultFolderRuntime(dataDir, store);

  return store;
}
