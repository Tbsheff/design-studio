import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { statfs } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { claudeVersion, compareClaudeVersion } from "./claude-cli.js";
import type { ClaudeLocation } from "./claude-cli.js";
import type { GitChoice } from "./git-choice.js";

export type CheckStatus = "ok" | "warn" | "fail";

export type FixAction =
  | "install-clt"
  | "copy-claude"
  | "copy-claude-install"
  | "open-terminal"
  | "reveal-data";

export const FIX_ACTIONS: readonly FixAction[] = [
  "install-clt",
  "copy-claude",
  "copy-claude-install",
  "open-terminal",
  "reveal-data",
];

export const CLAUDE_INSTALL_COMMAND = "npm i -g @anthropic-ai/claude-code";

export interface CheckResult {
  id: "git" | "claude" | "disk" | "network" | "design-memory";
  label: string;
  status: CheckStatus;
  required: boolean;
  detail: string;
  fixes: FixAction[];
}

export interface ClaudeSetup {
  location: ClaudeLocation | null;
  expectedVersion: string | null;
}

export interface CheckInputs {
  git: GitChoice;
  claude: ClaudeSetup;
  claudeEnv: Record<string, string>;
  dataDir: string;
  env: NodeJS.ProcessEnv;
}

const AUTH_TIMEOUT_MS = 15_000;
const NETWORK_TIMEOUT_MS = 5000;
const DISK_FAIL_BYTES = 1024 ** 3;
const DISK_WARN_BYTES = 5 * 1024 ** 3;

const GIT_DETAIL: Record<GitChoice["kind"], string> = {
  bundled:
    "Bundled git. Install Command Line Tools to use the system git instead.",
  missing: "No git found. Install Command Line Tools.",
  system: "Command Line Tools git.",
};

export function checkGit(git: GitChoice): CheckResult {
  const fixes: FixAction[] = git.kind === "system" ? [] : ["install-clt"];

  return {
    detail: GIT_DETAIL[git.kind],
    fixes,
    id: "git",
    label: "Git",
    required: true,
    status: git.kind === "missing" ? "fail" : "ok",
  };
}

function runAuthStatus(
  binary: string,
  env: Record<string, string>
): Promise<{ stdout: string; timedOut: boolean; failed: boolean }> {
  return new Promise((resolve) => {
    execFile(
      binary,
      ["auth", "status", "--json"],
      { env, timeout: AUTH_TIMEOUT_MS },
      (error, stdout) => {
        const timedOut =
          Boolean(error) && (error as { killed?: boolean }).killed === true;

        resolve({
          failed: Boolean(error),
          stdout: String(stdout ?? ""),
          timedOut,
        });
      }
    );
  });
}

function parseLoggedIn(stdout: string): boolean | null {
  try {
    const parsed = JSON.parse(stdout) as { loggedIn?: unknown };

    return typeof parsed.loggedIn === "boolean" ? parsed.loggedIn : null;
  } catch {
    return null;
  }
}

const INSTALL_DETAIL = `Claude Code not found. Install it (\`${CLAUDE_INSTALL_COMMAND}\` or the installer at claude.ai), log in, then reopen Design Studio.`;

function olderDetail(found: string, expected: string): string {
  return `Update Claude Code: ${found} is older than ${expected}. Run \`claude update\` or \`${CLAUDE_INSTALL_COMMAND}\`, then reopen Design Studio.`;
}

export async function checkClaude(
  setup: ClaudeSetup,
  env: Record<string, string>
): Promise<CheckResult> {
  const base = { id: "claude" as const, label: "Claude Code", required: true };
  const binary = setup.location?.path;

  if (!binary || !existsSync(binary)) {
    return {
      ...base,
      detail: INSTALL_DETAIL,
      fixes: ["copy-claude-install", "open-terminal"],
      status: "fail",
    };
  }

  const found = await claudeVersion(binary, env);
  const fit = compareClaudeVersion(found, setup.expectedVersion);

  if (fit === "older" && found && setup.expectedVersion) {
    return {
      ...base,
      detail: olderDetail(found, setup.expectedVersion),
      fixes: ["copy-claude-install", "open-terminal"],
      status: "fail",
    };
  }

  const result = await runAuthStatus(binary, env);

  if (result.timedOut) {
    return {
      ...base,
      detail: "No answer in 15 s. A Keychain prompt may be open.",
      fixes: [],
      status: "warn",
    };
  }

  const loggedIn = parseLoggedIn(result.stdout);

  if (!loggedIn) {
    return {
      ...base,
      detail:
        "Not logged in. Run `claude` in Terminal and log in, then recheck.",
      fixes: ["copy-claude", "open-terminal"],
      status: "fail",
    };
  }

  const version = found ? ` Claude Code ${found}.` : "";

  if (fit === "newer") {
    return {
      ...base,
      detail: `Logged in.${version} It is newer than ${setup.expectedVersion}, the version Design Studio was tested with.`,
      fixes: [],
      status: "warn",
    };
  }

  return { ...base, detail: `Logged in.${version}`, fixes: [], status: "ok" };
}

function existingAncestor(dir: string): string {
  let current = path.resolve(dir);

  while (!existsSync(current) && path.dirname(current) !== current) {
    current = path.dirname(current);
  }

  return current;
}

export async function checkDisk(dataDir: string): Promise<CheckResult> {
  const stats = await statfs(existingAncestor(dataDir));
  const free = stats.bavail * stats.bsize;
  const gb = (free / 1024 ** 3).toFixed(1);

  const status: CheckStatus =
    free < DISK_FAIL_BYTES ? "fail" : free < DISK_WARN_BYTES ? "warn" : "ok";

  return {
    detail: `${gb} GB free for ${dataDir}.`,
    fixes: ["reveal-data"],
    id: "disk",
    label: "Disk space",
    required: true,
    status,
  };
}

export async function checkNetwork(
  fetchFn: typeof fetch = fetch
): Promise<CheckResult> {
  const base = {
    fixes: [],
    id: "network" as const,
    label: "Network to api.anthropic.com",
    required: false,
  };

  try {
    await fetchFn("https://api.anthropic.com/", {
      method: "HEAD",
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });

    return { ...base, detail: "Reachable.", status: "ok" };
  } catch {
    return {
      ...base,
      detail:
        "Not reachable. Agent runs need it; offline you can still open and edit projects.",
      status: "warn",
    };
  }
}

export function checkDesignMemory(env: NodeJS.ProcessEnv): CheckResult {
  const dir =
    env.DESIGN_MEMORY_HOME ||
    path.join(env.HOME ?? os.homedir(), ".design-memory");

  const found = existsSync(dir);

  const detail = found
    ? `Found at ${dir}.`
    : `Not found at ${dir}. Optional: taste rules stay off.`;

  return {
    detail,
    fixes: [],
    id: "design-memory",
    label: "Design memory library",
    required: false,
    status: found ? "ok" : "warn",
  };
}

export async function runChecks(inputs: CheckInputs): Promise<CheckResult[]> {
  const [claude, disk, network] = await Promise.all([
    checkClaude(inputs.claude, inputs.claudeEnv),
    checkDisk(inputs.dataDir),
    checkNetwork(),
  ]);

  return [
    checkGit(inputs.git),
    claude,
    disk,
    network,
    checkDesignMemory(inputs.env),
  ];
}

export function needsAttention(results: CheckResult[]): boolean {
  return results.some((result) => result.required && result.status === "fail");
}
