import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { RULE_MAX_CHARS } from "../../shared/permissionRules.js";
import { createKeyedMutex } from "./mutex.js";

const COMMAND_RULES_MAX = 200;
const SEGMENT_MAX = 80;
const TEMP_SUFFIX_BYTES = 4;

interface CommandRuleScope {
  readonly deviceId: string;
  readonly userId: string;
}

type CommandRuleRole = "owner" | "admin" | "member" | "viewer";

interface CommandRuleStore {
  readonly add: (
    projectId: string,
    rule: string,
    scope: CommandRuleScope | null
  ) => Promise<string[]>;
  readonly list: (
    projectId: string,
    scope: CommandRuleScope | null
  ) => Promise<string[]>;
  readonly remove: (
    projectId: string,
    rule: string,
    scope: CommandRuleScope | null
  ) => Promise<string[]>;
}

const isOrgCapAllowed = (
  cap: boolean | null,
  role: CommandRuleRole | null,
  isSettingOn: boolean
): boolean => {
  if (!isSettingOn || role === "viewer") {
    return false;
  }

  return cap !== false;
};

const toSafeSegment = (value: string): string =>
  value.replaceAll(/[^A-Za-z0-9_-]/gu, "_").slice(0, SEGMENT_MAX);

const lock = createKeyedMutex();

const hasRuleFile = async (file: string): Promise<boolean> => {
  try {
    await stat(file);

    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

interface RuleFile {
  readonly rules?: readonly string[];
}

const toRuleList = (parsed: RuleFile | null): string[] => {
  const rules = parsed?.rules ?? null;

  if (!Array.isArray(rules)) {
    return [];
  }

  return rules.filter((rule): rule is string => typeof rule === "string");
};

const getRuleFile = async (file: string): Promise<string[]> => {
  if (!(await hasRuleFile(file))) {
    return [];
  }

  try {
    return toRuleList(JSON.parse(await readFile(file, "utf-8")));
  } catch (error) {
    console.error("[command-rules] unreadable file", file, error);

    return [];
  }
};

const setRuleFile = async (file: string, rules: string[]): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomBytes(TEMP_SUFFIX_BYTES).toString("hex")}.tmp`;
  await writeFile(temp, JSON.stringify({ rules }, null, 2));
  await rename(temp, file);
};

const toAddedRules = (rules: string[], rule: string): string[] => {
  if (!rule || rule.length > RULE_MAX_CHARS || rules.includes(rule)) {
    return rules;
  }

  return [...rules, rule].slice(-COMMAND_RULES_MAX);
};

const toRemovedRules = (rules: string[], rule: string): string[] => {
  if (!rules.includes(rule)) {
    return rules;
  }

  return rules.filter((item) => item !== rule);
};

const createCommandRuleStore = (
  projectDir: (projectId: string) => string
): CommandRuleStore => {
  const toLegacyFile = (projectId: string): string =>
    path.join(projectDir(projectId), "command-rules.json");

  const toScopedFile = (
    projectId: string,
    scope: CommandRuleScope | null
  ): string => {
    if (!scope?.deviceId || !scope.userId) {
      return toLegacyFile(projectId);
    }

    return path.join(
      projectDir(projectId),
      `command-rules.${toSafeSegment(scope.deviceId)}.${toSafeSegment(scope.userId)}.json`
    );
  };

  const getScoped = async (
    projectId: string,
    scope: CommandRuleScope | null
  ): Promise<string[]> => {
    const file = toScopedFile(projectId, scope);
    const legacyFile = toLegacyFile(projectId);

    if (file !== legacyFile && !(await hasRuleFile(file))) {
      return getRuleFile(legacyFile);
    }

    return getRuleFile(file);
  };

  const updateScoped = (
    projectId: string,
    scope: CommandRuleScope | null,
    change: (rules: string[]) => string[]
  ): Promise<string[]> => {
    const file = toScopedFile(projectId, scope);

    return lock(file, async () => {
      const before = await getScoped(projectId, scope);
      const after = change(before);

      if (after !== before) {
        await setRuleFile(file, after);
      }

      return after;
    });
  };

  return {
    add: (projectId, rule, scope) =>
      updateScoped(projectId, scope, (rules) => toAddedRules(rules, rule)),
    list: (projectId, scope) => getScoped(projectId, scope),
    remove: (projectId, rule, scope) =>
      updateScoped(projectId, scope, (rules) => toRemovedRules(rules, rule)),
  };
};

export { COMMAND_RULES_MAX, createCommandRuleStore, isOrgCapAllowed };

export type { CommandRuleRole, CommandRuleScope, CommandRuleStore };
