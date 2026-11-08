import type { SkillCatalog, SkillInfo } from "@design-studio/contracts";
import { startTransition, useCallback, useEffect, useState } from "react";

import { api, errorText } from "../../api.js";

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

const useSkillCatalog = (): {
  catalog: SkillCatalog | null;
  error: string | null;
  reload: () => void;
} => {
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

  return { catalog, error, reload: () => void load(true) };
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
): SkillInfo[] =>
  (catalog?.skills ?? []).filter((skill) => !disabled.includes(skill.id));

const skillInstruction = (ids: readonly string[]): string =>
  ids.map((id) => `Use the ${id} skill.`).join("\n");

const skillsFromPrompt = (prompt: string): string[] =>
  [...prompt.matchAll(/^Use the (\S+:\S+) skill\.$/gmu)].map(
    (match) => match[1] ?? ""
  );

const withoutSkillLines = (prompt: string): string =>
  prompt.replaceAll(/^Use the \S+:\S+ skill\.$/gmu, "").trim();

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

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
