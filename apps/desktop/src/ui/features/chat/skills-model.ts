import { useCallback, useEffect, useState } from "react";

import type { SkillCatalog, SkillInfo } from "../../../shared/contracts.js";
import { api, errorText } from "../../api.js";

let request: Promise<SkillCatalog> | null = null;
let lastCatalog: SkillCatalog | null = null;

const fetchSkillCatalog = (fresh = false): Promise<SkillCatalog> => {
  if (fresh || !request) {
    request = api.listSkills().then(
      (catalog) => {
        lastCatalog = catalog;

        return catalog;
      },
      (error: unknown) => {
        request = null;
        throw error;
      }
    );
  }

  return request;
};

export const useSkillCatalog = (): {
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
    fetchSkillCatalog(fresh).then(
      (result) => {
        if (!live) {
          return;
        }

        setCatalog(result);
        setError(null);
      },
      (caught: unknown) => live && setError(errorText(caught))
    );

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => load(false), [load]);

  return { catalog, error, reload: () => void load(true) };
};

export const skillDisplayName = (id: string): string =>
  id.startsWith("personal:") ? id.slice("personal:".length) : id;

export const originText = (origin: SkillInfo["origin"]): string =>
  origin === "personal" ? "personal" : origin.slice("plugin:".length);

export const enabledSkills = (
  catalog: SkillCatalog | null,
  disabled: readonly string[]
): SkillInfo[] =>
  (catalog?.skills ?? []).filter((skill) => !disabled.includes(skill.id));

export const skillInstruction = (ids: readonly string[]): string =>
  ids.map((id) => `Use the ${id} skill.`).join("\n");

export const skillsFromPrompt = (prompt: string): string[] =>
  [...prompt.matchAll(/^Use the (\S+:\S+) skill\.$/gmu)].map(
    (match) => match[1] ?? ""
  );

export const withoutSkillLines = (prompt: string): string =>
  prompt.replaceAll(/^Use the \S+:\S+ skill\.$/gmu, "").trim();

export const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export const NO_SKILLS_TEXT =
  "No skills found. Add a folder with a SKILL.md to ~/.claude/skills, or enable a Claude Code plugin that has skills.";
