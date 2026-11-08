import { createElement } from "react";
import type { ReactElement } from "react";

import type { Command } from "../../chat-slots.js";
import { copy } from "./copy.js";
import {
  commandChoice,
  matches,
  shownCommands,
  skillChoice,
  skillStatus,
  toQueryStatus,
  toShownSkills,
} from "./skill-picker-model.js";
import { enabledSkills, plural, useSkillCatalog } from "./skills-model.js";
import type { SlashSection } from "./slash-menu-model.js";

interface SlashSourceProps {
  disabled: readonly string[];
  exclude: readonly string[];
  commands: readonly Command[];
  onSkill: (id: string) => void;
  onCommand: (command: Command) => void;
}

interface UseSlashSectionsResult {
  readonly note: ReactElement | null;
  readonly sections: (query: string) => SlashSection[];
}

const toManualNote = (manualCount: number): ReactElement | null => {
  if (manualCount > 0) {
    return createElement(
      "span",
      { "data-tip": copy.theseSkillsSet, "data-tip-side": "top" },
      plural(manualCount, "manual-only skill"),
      copy.notListed
    );
  }

  return null;
};

const useSlashSections = ({
  disabled,
  exclude,
  commands,
  onSkill,
  onCommand,
}: SlashSourceProps): UseSlashSectionsResult => {
  const { catalog, error } = useSkillCatalog();
  const on = enabledSkills(catalog, disabled);
  const excluded = new Set(exclude);

  const all = on.filter(
    (skill) => skill.modelInvocable && !excluded.has(skill.id)
  );

  const manualCount = on.filter((skill) => !skill.modelInvocable).length;
  const status = skillStatus(catalog, error, all.length);

  const sections = (query: string): SlashSection[] => {
    const skills = all.filter((skill) => matches(skill, query));

    return [
      {
        items: shownCommands(commands, query).map((command) =>
          commandChoice(command, onCommand)
        ),
        label: "Commands",
      },
      {
        items: toShownSkills(skills, query).map((skill) =>
          skillChoice(skill, onSkill)
        ),
        label: "Skills",
        status: toQueryStatus(query, status),
      },
    ];
  };

  return { note: toManualNote(manualCount), sections };
};

export { useSlashSections };
