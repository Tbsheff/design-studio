import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { RULE_MAX_CHARS } from "../../shared/permissionRules.js";
import { createKeyedMutex } from "./mutex.js";

export const COMMAND_RULES_MAX = 200;
const SEGMENT_MAX = 80;

export interface CommandRuleScope {
  deviceId: string;
  userId: string;
}

export type CommandRuleRole = "owner" | "admin" | "member" | "viewer";

export interface CommandRuleStore {
  list(projectId: string, scope?: CommandRuleScope | null): Promise<string[]>;
  add(
    projectId: string,
    rule: string,
    scope?: CommandRuleScope | null
  ): Promise<string[]>;
  remove(
    projectId: string,
    rule: string,
    scope?: CommandRuleScope | null
  ): Promise<string[]>;
}

export const orgCapAllows = (
  cap: boolean | null | undefined,
  role: CommandRuleRole | null | undefined,
  setting: boolean
): boolean => {
  if (!setting || role === "viewer") {
    return false;
  }

  return cap !== false;
};

const safeSegment = (value: string): string =>
  value.replaceAll(/[^A-Za-z0-9_-]/gu, "_").slice(0, SEGMENT_MAX);

const lock = createKeyedMutex();

const read = async (file: string): Promise<string[]> => {
  if (!existsSync(file)) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf-8"));
    const rules = (parsed as { rules?: unknown } | null)?.rules;

    return Array.isArray(rules)
      ? rules.filter((rule): rule is string => typeof rule === "string")
      : [];
  } catch (error) {
    console.error("[command-rules] unreadable file", file, error);

    return [];
  }
};

const write = async (file: string, rules: string[]): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temp, JSON.stringify({ rules }, null, 2));
  await rename(temp, file);
};

export function createCommandRuleStore(
  projectDir: (projectId: string) => string
): CommandRuleStore {
  const legacyFileOf = (projectId: string): string =>
    path.join(projectDir(projectId), "command-rules.json");

  const fileOf = (
    projectId: string,
    scope?: CommandRuleScope | null
  ): string => {
    if (!scope?.deviceId || !scope.userId) {
      return legacyFileOf(projectId);
    }

    return path.join(
      projectDir(projectId),
      `command-rules.${safeSegment(scope.deviceId)}.${safeSegment(scope.userId)}.json`
    );
  };

  const readScoped = (
    projectId: string,
    scope?: CommandRuleScope | null
  ): Promise<string[]> => {
    const file = fileOf(projectId, scope);

    if (file !== legacyFileOf(projectId) && !existsSync(file)) {
      return read(legacyFileOf(projectId));
    }

    return read(file);
  };

  const mutate = (
    projectId: string,
    scope: CommandRuleScope | null | undefined,
    change: (rules: string[]) => string[]
  ): Promise<string[]> => {
    const file = fileOf(projectId, scope);

    return lock(file, async () => {
      const before = await readScoped(projectId, scope);
      const after = change(before);

      if (after !== before) {
        await write(file, after);
      }

      return after;
    });
  };

  return {
    list: (projectId, scope) => readScoped(projectId, scope),
    add: (projectId, rule, scope) =>
      mutate(projectId, scope, (rules) => {
        if (!rule || rule.length > RULE_MAX_CHARS || rules.includes(rule)) {
          return rules;
        }

        return [...rules, rule].slice(-COMMAND_RULES_MAX);
      }),
    remove: (projectId, rule, scope) =>
      mutate(projectId, scope, (rules) =>
        rules.includes(rule) ? rules.filter((item) => item !== rule) : rules
      ),
  };
}
