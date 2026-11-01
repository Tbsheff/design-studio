import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

import { runProcess } from "../process/spawn.js";

const READ_TIMEOUT_MS = 15_000;
const WRITE_TIMEOUT_MS = 60_000;
const NETWORK_TIMEOUT_MS = 120_000;
const MAX_STDOUT_BYTES = 67_108_864;
const MS_PER_SECOND = 1000;
const STDERR_TAIL_LINES = 3;

class UserGitError extends Error {
  public readonly code: number | null;
  public readonly stderr: string;

  public constructor(message: string, code: number | null, stderr: string) {
    super(message);
    this.name = "UserGitError";
    this.code = code;
    this.stderr = stderr;
  }
}

interface ExecOptions {
  allowFail?: boolean;
  cwd: string;
  env?: Record<string, string>;
  input?: string;
  timeoutMs?: number;
}

interface ExecResult {
  code: number | null;
  stderr: string;
  stdout: string;
}

const isUserVar = (key: string): boolean =>
  !key.startsWith("GIT_") &&
  !key.startsWith("STUDIO_") &&
  !key.startsWith("ANTHROPIC_");

const userEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (isUserVar(key)) {
      env[key] = value;
    }
  }

  return {
    ...env,
    GCM_INTERACTIVE: "never",
    GH_PROMPT_DISABLED: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_SSH_COMMAND: "ssh -o BatchMode=yes",
    GIT_TERMINAL_PROMPT: "0",
    ...extra,
  };
};

const commandName = (binary: string, args: readonly string[]): string => {
  const verb =
    args.find((arg) => !arg.startsWith("-") && !arg.includes("=")) ?? "";

  return `${path.basename(binary)} ${verb}`.trim();
};

const failureText = (stderr: string, code: number | null): string => {
  const tail = stderr.split("\n").slice(-STDERR_TAIL_LINES).join(" ");

  if (tail !== "") {
    return tail;
  }

  return `exit ${String(code)}`;
};

const startProcess = async (
  binary: string,
  args: readonly string[],
  options: ExecOptions,
  timeoutMs: number
): Promise<ExecResult & { timedOut: boolean }> => {
  try {
    return await runProcess(binary, args, {
      cwd: options.cwd,
      env: userEnv(options.env),
      input: options.input,
      maxStdoutBytes: MAX_STDOUT_BYTES,
      timeoutMs,
    });
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    throw new UserGitError(
      `${path.basename(binary)} could not start: ${error.message}`,
      null,
      ""
    );
  }
};

const execTool = async (
  binary: string,
  args: readonly string[],
  options: ExecOptions
): Promise<ExecResult> => {
  const timeoutMs = options.timeoutMs ?? READ_TIMEOUT_MS;
  const result = await startProcess(binary, args, options, timeoutMs);
  const { code, stdout } = result;
  const stderr = result.stderr.trim();
  const name = commandName(binary, args);

  if (result.timedOut) {
    const seconds = Math.round(timeoutMs / MS_PER_SECOND);

    throw new UserGitError(
      `${name} took longer than ${String(seconds)} s and was stopped. If git asks for a password or a signing passphrase, it cannot ask from here.`,
      null,
      stderr
    );
  }

  if (code !== 0 && options.allowFail !== true) {
    throw new UserGitError(
      `${name} failed: ${failureText(stderr, code)}`,
      code,
      stderr
    );
  }

  return { code, stderr, stdout };
};

const userGit = (
  cwd: string,
  args: readonly string[],
  options: Omit<ExecOptions, "cwd"> = {}
): Promise<ExecResult> => execTool("git", args, { ...options, cwd });

const isExecutable = async (candidate: string): Promise<boolean> => {
  try {
    await access(candidate, constants.X_OK);

    return true;
  } catch {
    return false;
  }
};

const findOnPath = async (
  name: string,
  searchPath = process.env.PATH ?? ""
): Promise<string | null> => {
  const candidates = searchPath
    .split(path.delimiter)
    .filter((dir) => dir !== "")
    .map((dir) => path.join(dir, name));

  const checks = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      executable: await isExecutable(candidate),
    }))
  );

  return checks.find((check) => check.executable)?.candidate ?? null;
};

export {
  NETWORK_TIMEOUT_MS,
  READ_TIMEOUT_MS,
  UserGitError,
  WRITE_TIMEOUT_MS,
  execTool,
  findOnPath,
  userEnv,
  userGit,
};

export type { ExecOptions, ExecResult };
