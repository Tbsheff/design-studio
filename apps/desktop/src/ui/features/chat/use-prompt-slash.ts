import type { SelectionContext } from "@design-studio/contracts";
import { useMemo } from "react";

import { composerCommands, useCommands } from "../../chat-slots.js";
import type { Command } from "../../chat-slots.js";
import { focusComposerInput } from "./composer-focus.js";
import type { VariationsPromptProps } from "./prompt-box-model.js";
import type { PromptBoxProps } from "./prompt-box-props.js";
import {
  addSkillId,
  designsBlocker,
  modeGroup,
  toSlashCommands,
} from "./prompt-send-model.js";
import type { DesignsSetting } from "./run-settings-model.js";
import { effortGroup, levelGroup, modelGroup } from "./slash-groups.js";
import type { SlashMenuResult } from "./slash-menu-model.js";
import type { PromptBase } from "./use-prompt-base.js";
import { useSlashMenu } from "./use-slash-menu.js";
import { useSlashSections } from "./use-slash-sections.js";

interface PromptSlash {
  readonly designs: DesignsSetting | undefined;
  readonly slash: SlashMenuResult;
}

const runCommand = (command: Command): void => command.run();

const toDesigns = (
  variations: VariationsPromptProps | undefined,
  mode: PromptBase["mode"],
  selection: SelectionContext[]
): DesignsSetting | undefined => {
  if (!variations) {
    return;
  }

  return {
    disabledReason: designsBlocker(mode, selection.length),
    max: variations.max,
    onChange: variations.onCount,
    value: variations.count,
  };
};

const usePromptSlash = (
  props: PromptBoxProps,
  base: PromptBase
): PromptSlash => {
  const { chooseModel, draft, effort, mode, runLevel, setDraft } = base;
  const { setEffort, setMode, setSkillIds, skillIds } = base;
  const { variations, selection } = props;

  const focus = focusComposerInput;
  const { choose: setLevel, level } = runLevel;

  useCommands(() =>
    composerCommands({ focus, level, mode, setLevel, setMode, variations })
  );

  const slashSource = useSlashSections({
    commands: toSlashCommands(),
    disabled: props.settings.disabledSkills ?? [],
    exclude: skillIds,
    onCommand: runCommand,
    onSkill: (id) => setSkillIds((previous) => addSkillId(previous, id)),
    onTweaks: props.onTweaks ?? null,
  });

  const groups = [
    levelGroup(level, setLevel),
    modelGroup(props.model, level, chooseModel),
    effortGroup(effort, setEffort),
    modeGroup(mode, setMode),
  ];

  const label = "Settings, commands and skills";
  const { note, sections } = slashSource;

  const slash = useSlashMenu({
    draft,
    groups,
    label,
    note,
    sections,
    setDraft,
  });

  const designs = useMemo(
    () => toDesigns(variations, mode, selection),
    [variations, mode, selection]
  );

  return { designs, slash };
};

export { usePromptSlash };

export type { PromptSlash };
