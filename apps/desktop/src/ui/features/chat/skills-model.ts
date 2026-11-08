import type { SkillCatalog, SkillInfo } from "@design-studio/contracts";
import { startTransition, useCallback, useEffect, useState } from "react";

import { api, errorText } from "../../api.js";
import { toPlural } from "./plural-model.js";

let request: Promise<SkillCatalog> | null = null;
let lastCatalog: SkillCatalog | null = null;

const requestSkillCatalog = async (): Promise<SkillCatalog> => {
  try {
    const catalog = await api.listSkills();
    lastCatalog = catalog;

    return catalog;
  } catch (error: unknown) {
    request = null;
    throw error;
  }
};

const fetchSkillCatalog = (fresh = false): Promise<SkillCatalog> => {
  if (fresh || !request) {
    request = requestSkillCatalog();
  }

  return request;
};

interface SkillCatalogState {
  catalog: SkillCatalog | null;
  error: string | null;
  reload: () => void;
}

const useSkillCatalog = (): SkillCatalogState => {
  const [catalog, setCatalog] = useState<SkillCatalog | null>(
    () => lastCatalog
  );

  const [error, setError] = useState<string | null>(null);

  const load = useCallback((fresh: boolean) => {
    let live = true;
    startTransition(async () => {
      try {
        const result = await fetchSkillCatalog(fresh);

        if (live) {
          setCatalog(result);
          setError(null);
        }
      } catch (thrownError: unknown) {
        if (live) {
          setError(errorText(thrownError));
        }
      }
    });

    return (): void => {
      live = false;
    };
  }, []);

  useEffect(() => load(false), [load]);

  return {
    catalog,
    error,
    reload: (): void => {
      load(true);
    },
  };
};

const skillDisplayName = (id: string): string => {
  if (id.startsWith("personal:")) {
    return id.slice("personal:".length);
  }

  return id;
};

const originText = (origin: SkillInfo["origin"]): string => {
  if (origin === "personal") {
    return "personal";
  }

  return origin.slice("plugin:".length);
};

const enabledSkills = (
  catalog: SkillCatalog | null,
  disabled: readonly string[]
): SkillInfo[] => {
  const off = new Set(disabled);

  return (catalog?.skills ?? []).filter((skill) => !off.has(skill.id));
};

const skillInstruction = (ids: readonly string[]): string =>
  ids.map((id) => `Use the ${id} skill.`).join("\n");

const SKILL_PREFIX = "Use the ";
const SKILL_SUFFIX = " skill.";

const toSkillId = (line: string): string | null => {
  if (!line.startsWith(SKILL_PREFIX) || !line.endsWith(SKILL_SUFFIX)) {
    return null;
  }

  const id = line.slice(SKILL_PREFIX.length, -SKILL_SUFFIX.length);
  const colon = id.indexOf(":");

  if (colon < 1 || colon === id.length - 1 || /\s/u.test(id)) {
    return null;
  }

  return id;
};

const skillsFromPrompt = (prompt: string): string[] =>
  prompt
    .split("\n")
    .map((line) => toSkillId(line))
    .filter((id): id is string => id !== null);

const withoutSkillLines = (prompt: string): string =>
  prompt
    .split("\n")
    .filter((line) => toSkillId(line) === null)
    .join("\n")
    .trim();

const plural = (count: number, word: string): string =>
  `${count} ${word}${toPlural(count)}`;

const NO_SKILLS_TEXT =
  "No skills found. Add a folder with a SKILL.md to ~/.claude/skills, or enable a Claude Code plugin that has skills.";

export {
  NO_SKILLS_TEXT,
  enabledSkills,
  originText,
  plural,
  skillDisplayName,
  skillInstruction,
  skillsFromPrompt,
  useSkillCatalog,
  withoutSkillLines,
};
