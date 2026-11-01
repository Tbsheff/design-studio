import { execFile } from "node:child_process";
import type { ExecFileException } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

interface GitScope {
  gitDir: string;
  indexFile?: string;
  untracked?: string[];
  workTree?: string;
}

interface GitResult {
  stdout: string;
}

interface RunGitOptions {
  cwd?: string;
  input?: string;
  okCodes?: number[];
}

interface ExecFailure extends Omit<ExecFileException, "stderr" | "stdout"> {
  stderr?: Buffer | string;
  stdout?: Buffer | string;
}

const MAX_TEXT_BUFFER = 268_435_456;
const MAX_BINARY_BUFFER = 1_073_741_824;
const STUDIO_NAME = "Design Studio";
const STUDIO_EMAIL = "studio@localhost";

const execFileAsync = promisify(execFile);

let gitBinary: Promise<string> | null = null;
let gitEnvBase: NodeJS.ProcessEnv | null = null;

const ignoreError = (): null => null;

const fileExists = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const findGitBinary = async (): Promise<string> => {
  try {
    const { stdout } = await execFileAsync("git", ["--exec-path"], {
      encoding: "utf-8",
    });

    const candidate = path.join(stdout.trim(), "git");

    if (await fileExists(candidate)) {
      return candidate;
    }

    return "git";
  } catch {
    return "git";
  }
};

const resolveGitBinary = (): Promise<string> => {
  const override = process.env.STUDIO_GIT ?? "";

  if (override !== "") {
    return Promise.resolve(override);
  }

  gitBinary ??= findGitBinary();

  return gitBinary;
};

const buildBaseEnv = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_AUTHOR_EMAIL: STUDIO_EMAIL,
    GIT_AUTHOR_NAME: STUDIO_NAME,
    GIT_COMMITTER_EMAIL: STUDIO_EMAIL,
    GIT_COMMITTER_NAME: STUDIO_NAME,
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };

  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;

  return env;
};

const baseGitEnv = (): NodeJS.ProcessEnv => {
  gitEnvBase ??= buildBaseEnv();

  return gitEnvBase;
};

const gitEnv = (scope: GitScope): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...baseGitEnv(), GIT_DIR: scope.gitDir };
  const workTree = scope.workTree ?? null;
  const indexFile = scope.indexFile ?? null;

  if (workTree !== null) {
    env.GIT_WORK_TREE = workTree;
  }

  if (indexFile !== null) {
    env.GIT_INDEX_FILE = indexFile;
  }

  return env;
};

const gitFailure = (args: readonly string[], error: ExecFailure): Error => {
  const stderr = String(error.stderr ?? "").trim();
  const verb = args[0] ?? "";

  if (stderr === "") {
    return new Error(`git ${verb} failed: ${error.message}`);
  }

  return new Error(`git ${verb} failed: ${stderr}`);
};

const acceptExit = (
  error: ExecFailure,
  args: readonly string[],
  okCodes: readonly number[]
): GitResult => {
  if (okCodes.some((code) => code === error.code)) {
    return { stdout: String(error.stdout ?? "") };
  }

  throw gitFailure(args, error);
};

const runGit = async (
  scope: GitScope,
  args: readonly string[],
  options: RunGitOptions = {}
): Promise<GitResult> => {
  const binary = await resolveGitBinary();

  const pending = execFileAsync(binary, args, {
    cwd: options.cwd ?? scope.workTree ?? scope.gitDir,
    encoding: "utf-8",
    env: gitEnv(scope),
    maxBuffer: MAX_TEXT_BUFFER,
  });

  const input = options.input ?? null;

  if (input !== null) {
    pending.child.stdin?.on("error", ignoreError);
    pending.child.stdin?.end(input);
  }

  try {
    const { stdout } = await pending;

    return { stdout };
  } catch (error) {
    return acceptExit(error as ExecFailure, args, options.okCodes ?? []);
  }
};

const runGitBuffer = async (
  scope: GitScope,
  args: readonly string[]
): Promise<Uint8Array> => {
  const binary = await resolveGitBinary();

  try {
    const { stdout } = await execFileAsync(binary, args, {
      cwd: scope.gitDir,
      encoding: "buffer",
      env: gitEnv(scope),
      maxBuffer: MAX_BINARY_BUFFER,
    });

    return new Uint8Array(stdout);
  } catch (error) {
    throw gitFailure(args, error as ExecFailure);
  }
};

export { gitEnv, resolveGitBinary, runGit, runGitBuffer };

export type { GitResult, GitScope, RunGitOptions };
