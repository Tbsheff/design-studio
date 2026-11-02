import path from "node:path";

import { BLOCKED_SEGMENTS } from "../paths/index.js";
import {
  SECRET_MESSAGE,
  checkReadOnlyDirs,
  isExecutedConfigFile,
  isSecretFile,
} from "./path-checks.js";
import { isText } from "./tool-input.js";
import type { ToolInput } from "./tool-input.js";
import type { ToolPolicy } from "./tool-names.js";

const PACKAGE_TOOLS = new Set([
  "npm",
  "npx",
  "pnpm",
  "pnpx",
  "yarn",
  "bun",
  "bunx",
  "pip",
  "pip3",
  "uv",
  "brew",
  "cargo",
  "gem",
  "corepack",
]);

const GO_INSTALL_VERBS = new Set(["get", "install"]);

const INLINE_CODE_PATTERNS = [
  /\b(?:sh|bash|zsh|dash)\s+(?:-\w*\s+)*-\w*c\b/u,
  /(?:^|[^\w-])eval(?:\s|$)/u,
  /\bnode\s+(?:-\S+\s+)*(?:-e|--eval|-p|--print)\b/u,
  /\bpython[0-9.]*\s+(?:-\S+\s+)*-c\b/u,
];

const SECRET_IN_COMMAND =
  /(?:^|[\s'"=/])\.env(?:\.(?!example\b|sample\b|template\b)[\w.-]+)?(?=$|[\s'";|&)])/u;

const READ_ONLY_COMMANDS = new Set([
  "cat",
  "ls",
  "head",
  "tail",
  "grep",
  "rg",
  "wc",
  "file",
  "stat",
  "du",
  "tree",
  "find",
  "cd",
  "pwd",
  "echo",
  "sort",
  "uniq",
  "jq",
]);

const FIND_WRITES = /\s-(?:delete|exec|execdir|ok|okdir|fprint\w*|fls)\b/u;

const GIT_READ_VERBS = new Set([
  "status",
  "diff",
  "log",
  "show",
  "ls-files",
  "rev-parse",
  "blame",
  "grep",
  "cat-file",
  "ls-tree",
  "describe",
  "shortlog",
  "--version",
  "version",
  "help",
]);

const GIT_MESSAGE =
  "Design Studio keeps its own versions, so the agent may only read git (status, diff, log, show). Ask the user to run other git commands by hand.";

const CLOUD_CLIS = new Set(["cf", "cloudflare", "wrangler"]);

const RUNNER_PREFIX =
  /^(?:\w+=\S*\s+)*(?:(?:npx|bunx|pnpx)\s+(?:-\S+\s+)*|(?:pnpm|yarn)\s+dlx\s+(?:-\S+\s+)*)?/u;

const CLOUD_MESSAGE =
  "Publishing to Cloudflare runs only from Share > Publish in Design Studio, after the user confirms what goes public. Do not call cf or wrangler.";

const commandTokens = (command: string): string[] =>
  command
    .split(/[\s;&|()`$"'<>{}]+/u)
    .filter((token) => token !== "")
    .map((token) => path.basename(token).toLowerCase());

const hasGoInstall = (tokens: string[]): boolean =>
  tokens.some(
    (token, index) =>
      token === "go" && GO_INSTALL_VERBS.has(tokens[index + 1] ?? "")
  );

const isInstallCommand = (command: string): boolean => {
  if (INLINE_CODE_PATTERNS.some((pattern) => pattern.test(command))) {
    return true;
  }

  const tokens = commandTokens(command);

  if (
    tokens.some(
      (token) =>
        PACKAGE_TOOLS.has(token) || token === "curl" || token === "wget"
    )
  ) {
    return true;
  }

  return hasGoInstall(tokens);
};

const escapeRegExp = (text: string): string =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

const writesInsideDir = (dir: string, command: string): boolean => {
  const pattern = new RegExp(
    `(?:^|[\\s'"=:(/.])${escapeRegExp(dir)}(?:/|[\\s'")]|$)`,
    "u"
  );

  if (!pattern.test(command)) {
    return false;
  }

  if (/[>]|\btee\b/u.test(command)) {
    return true;
  }

  const segments = command
    .split(/&&|\|\||;|\||\n/u)
    .map((part) => part.trim())
    .filter(Boolean);

  return segments.some((segment) => {
    const word =
      segment.replace(/^(?:\w+=\S*\s+)*/u, "").split(/\s+/u)[0] ?? "";

    return (
      !READ_ONLY_COMMANDS.has(word) ||
      (word === "find" && FIND_WRITES.test(segment))
    );
  });
};

const touchesReadOnlyDir = (
  policy: ToolPolicy,
  command: string
): string | null =>
  (policy.readOnlyDirs ?? []).find((dir) => writesInsideDir(dir, command)) ??
  null;

const isGitFlag = (word: string | undefined): boolean =>
  (word ?? "").startsWith("-") && word !== "--version";

const gitFlagWidth = (word: string | undefined): number => {
  if (word === "-C" || word === "-c") {
    return 2;
  }

  return 1;
};

const gitVerb = (segment: string): string | null => {
  const words = segment
    .replace(/^(?:\w+=\S*\s+)*/u, "")
    .split(/\s+/u)
    .filter(Boolean);

  const at = words.findIndex((word) => path.basename(word) === "git");

  if (at === -1) {
    return null;
  }

  let index = at + 1;

  while (index < words.length && isGitFlag(words[index])) {
    index += gitFlagWidth(words[index]);
  }

  return words[index] ?? "";
};

const writesGit = (command: string): boolean => {
  if (writesInsideDir(".git", command)) {
    return true;
  }

  return command.split(/&&|\|\||;|\||\n|\$\(|`/u).some((segment) => {
    const verb = gitVerb(segment.trim());

    return verb !== null && !GIT_READ_VERBS.has(verb);
  });
};

const callsCloudCli = (command: string): boolean =>
  command.split(/&&|\|\||;|\||\n|\$\(|`|\(/u).some((segment) => {
    const word =
      segment.trim().replace(RUNNER_PREFIX, "").split(/\s+/u, 1)[0] ?? "";

    const name = word.split("/").pop() ?? "";

    return CLOUD_CLIS.has(name.split("@", 1)[0] ?? "");
  });

const checkBash = (policy: ToolPolicy, input: ToolInput): string | null => {
  const { command } = input;

  if (!isText(command)) {
    return "Bash needs a command string.";
  }

  if (SECRET_IN_COMMAND.test(command)) {
    return SECRET_MESSAGE;
  }

  if (writesGit(command)) {
    return GIT_MESSAGE;
  }

  if (callsCloudCli(command)) {
    return CLOUD_MESSAGE;
  }

  const readOnly = touchesReadOnlyDir(policy, command);

  if (readOnly) {
    return `${readOnly}/ holds the untrusted source material of this design system. Shell commands may only read it (cat, ls, grep, find, head); change the design-system files instead.`;
  }

  if (!policy.allowInstall && isInstallCommand(command)) {
    return "Package managers, downloads and inline code (sh -c, eval, node -e, python -c) are turned off for this project.";
  }

  return null;
};

const bashWriteProblem = (
  policy: Pick<ToolPolicy, "workTree" | "allowInstall" | "readOnlyDirs">,
  relative: string
): string | null => {
  const input = { file_path: relative };

  if (relative.split("/").some((segment) => BLOCKED_SEGMENTS.has(segment))) {
    return `${relative} is inside .git or node_modules, which is off limits.`;
  }

  if (isSecretFile(relative)) {
    return SECRET_MESSAGE;
  }

  const problem = checkReadOnlyDirs(
    { ...policy, allowBash: true, mode: "edit" },
    input
  );

  if (problem) {
    return problem;
  }

  if (policy.allowInstall || !isExecutedConfigFile(relative)) {
    return null;
  }

  return `Package installs are off in this project, so the agent may not change ${path.basename(relative)}: build tools run this file as code. Ask the user to change it by hand.`;
};

export { bashWriteProblem, checkBash, isInstallCommand };
