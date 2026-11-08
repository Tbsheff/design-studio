import type { SkillInfo } from "@design-studio/contracts";

import { copy } from "./copy.js";
import { plural } from "./skills-model.js";

const groupByOrigin = (skills: SkillInfo[]): [string, SkillInfo[]][] => {
  const groups = new Map<string, SkillInfo[]>();

  for (const skill of skills) {
    groups.set(skill.origin, [...(groups.get(skill.origin) ?? []), skill]);
  }

  return [...groups.entries()];
};

const originLabel = (origin: string): string => {
  if (origin === "personal") {
    return "Personal skills (~/.claude/skills)";
  }

  return `Plugin ${origin.slice("plugin:".length)}`;
};

const matches = (skill: SkillInfo, query: string): boolean => {
  const needle = query.trim().toLowerCase();

  return (
    needle === "" ||
    skill.id.toLowerCase().includes(needle) ||
    skill.description.toLowerCase().includes(needle)
  );
};

const toggleSkill = (
  disabled: readonly string[],
  id: string,
  isOn: boolean
): string[] => {
  const rest = disabled.filter((item) => item !== id);

  if (isOn) {
    return rest;
  }

  return [...rest, id];
};

const toAllToggled = (skills: SkillInfo[], isOn: boolean): string[] => {
  if (isOn) {
    return [];
  }

  return skills.map((skill) => skill.id);
};

const toBashNote = (count: number): string => {
  let verb = "are on need";
  let pronoun = "them";

  if (count === 1) {
    verb = "is on needs";
    pronoun = "it";
  }

  return `${plural(count, "skill")}${copy.that} ${verb}${copy.shellCommandsToLet}${pronoun}${copy.runScriptsTurnOn}`;
};

export {
  groupByOrigin,
  matches,
  originLabel,
  toAllToggled,
  toBashNote,
  toggleSkill,
};
