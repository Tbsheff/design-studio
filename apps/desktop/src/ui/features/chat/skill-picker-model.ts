import type { SkillCatalog, SkillInfo } from "@design-studio/contracts";
import { createElement } from "react";

import { rank } from "../../chat-slots.js";
import type { Command } from "../../chat-slots.js";
import { copy } from "./copy.js";
import {
  NO_SKILLS_TEXT,
  enabledSkills,
  originText,
  plural,
} from "./skills-model.js";
import type { SlashChoice } from "./slash-menu-model.js";

const matches = (skill: SkillInfo, query: string): boolean => {
  const needle = query.trim().toLowerCase();

  return (
    needle === "" ||
    skill.id.toLowerCase().includes(needle) ||
    skill.description.toLowerCase().includes(needle)
  );
};

const shownCommands = (
  commands: readonly Command[],
  query: string
): Command[] => {
  const tokens = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);

  if (tokens.length === 0) {
    return [...commands].toSorted((left, right) =>
      (left.slash ?? "").localeCompare(right.slash ?? "")
    );
  }

  const hits = commands.filter((command) => {
    const slash = (command.slash ?? "").toLowerCase();
    const words = slash.split(/[\s-]+/u);

    return tokens.every(
      (token) =>
        slash.startsWith(token) || words.some((word) => word.startsWith(token))
    );
  });

  return rank(hits, tokens.join(" "), (command) => ({
    title: command.slash ?? command.title,
  })).map((ranked) => ranked.item);
};

const commandChoice = (
  command: Command,
  onCommand: (command: Command) => void
): SlashChoice => ({
  disabledReason: command.disabled ?? null,
  hint: command.title,
  icon: command.icon ?? "sparkle",
  id: command.id,
  label: `/${command.slash ?? ""}`,
  pick: () => onCommand(command),
});

const toNeedsShellTag = (needsBash: boolean): SlashChoice["tag"] => {
  if (needsBash) {
    return createElement("span", { className: "skill-tag" }, copy.needsShell);
  }

  return null;
};

const skillChoice = (
  skill: SkillInfo,
  onPick: (id: string) => void
): SlashChoice => ({
  hint: skill.description,
  icon: "book",
  id: skill.id,
  label: skill.name,
  meta: originText(skill.origin),
  pick: () => onPick(skill.id),
  tag: toNeedsShellTag(skill.needsBash),
  tip: `${skill.description}\n${skill.sourcePath}`,
});

const skillStatus = (
  catalog: { skills: readonly SkillInfo[] } | null,
  error: string | null,
  enabled: number
): string | null => {
  if (error) {
    return `Could not load skills (${error}). Type / again to retry.`;
  }

  if (!catalog) {
    return "Loading skills…";
  }

  if (catalog.skills.length === 0) {
    return NO_SKILLS_TEXT;
  }

  if (enabled === 0) {
    return "All skills are off for this project. Turn some on with the skills count below.";
  }

  return null;
};

const toShownSkills = (
  skills: readonly SkillInfo[],
  query: string
): SkillInfo[] => {
  if (query === "") {
    return skills.toSorted((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  return [...skills];
};

const toQueryStatus = (query: string, status: string | null): string | null => {
  if (query === "") {
    return status;
  }

  return null;
};

const toSkillsTip = (
  catalog: SkillCatalog | null,
  disabled: readonly string[]
): string => {
  if (!catalog) {
    return "Claude skills for this project";
  }

  const on = enabledSkills(catalog, disabled);
  const manual = on.filter((skill) => !skill.modelInvocable).length;

  return `${plural(on.length, "skill")} on for this project, ${plural(manual, "manual-only skill")} the agent cannot load`;
};

export {
  commandChoice,
  matches,
  shownCommands,
  skillChoice,
  skillStatus,
  toQueryStatus,
  toShownSkills,
  toSkillsTip,
};
