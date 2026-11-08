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

import { Result, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import { BadRequestError, isNodeError } from "../platform/errors/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";
import { bindDefaultFolderRuntime } from "./workspace-runtime.js";

export {
  DEFAULT_FOLDER_NAME,
  DEV_PROJECTS_FOLDER,
  projectsDirFromEnv,
} from "../platform/config/index.js";

export const PREFERENCES_FILE = "preferences.json";
const MAX_PATH_LENGTH = 4096;

const AbsolutePathSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_PATH_LENGTH),
  Schema.makeFilter((value: string) => path.isAbsolute(value))
);

const PreferencesSchema = Schema.Struct({
  onboardingDismissed: Schema.optionalKey(Schema.Boolean),
  projectsDir: Schema.optionalKey(AbsolutePathSchema),
  version: Schema.Literal(1),
});

type Preferences = typeof PreferencesSchema.Type;

const toPreferences = toDecoder(PreferencesSchema, "error");

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
      const parsed = toPreferences(JSON.parse(raw));

      if (Result.isSuccess(parsed)) {
        return parsed.success;
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
    const checked = toPreferences(data);

    if (Result.isFailure(checked)) {
      throw new BadRequestError("invalid preferences");
    }

    await writeFile(temp, `${JSON.stringify(checked.success, null, 2)}\n`);
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
