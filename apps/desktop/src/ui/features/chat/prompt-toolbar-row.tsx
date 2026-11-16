import type { ReactElement } from "react";

import type { PromptParts } from "./prompt-parts.js";
import { PromptToolbar } from "./prompt-toolbar.js";
import { usePlusProject } from "./use-plus-project.js";
import { usePromptToolbar } from "./use-prompt-toolbar.js";

const PromptToolbarRow = ({ parts }: { parts: PromptParts }): ReactElement => {
  const { base, box, slash, sending } = parts;
  const { insertMention, openSkills, sendProps } = usePromptToolbar(parts);
  const { addFiles, chooseModel, effort, mode, reasonId } = base;

  const { addReferenceFiles, pickReferenceFolder } = base.references;
  const { openUrlForm } = base.references.url;

  const { setEffort, setMode } = base;
  const { choose: onChooseLevel, level } = base.runLevel;
  const { designs } = slash;
  const { close: onCloseSlash } = slash.slash;
  const { model } = box;
  const onFocusSelection = parts.input.focus.focusSelection;
  const { spoken } = sending.status;
  const project = usePlusProject(box, base.sheet);
  const contextTokens = box.contextTokens ?? null;
  const contextWindow = box.contextWindow ?? null;

  return (
    <PromptToolbar
      contextTokens={contextTokens}
      contextWindow={contextWindow}
      designs={designs}
      effort={effort}
      level={level}
      mode={mode}
      model={model}
      onChooseLevel={onChooseLevel}
      onChooseModel={chooseModel}
      onCloseSlash={onCloseSlash}
      onEffort={setEffort}
      onFiles={addFiles}
      onReferenceFiles={addReferenceFiles}
      onReferenceFolder={pickReferenceFolder}
      onReferenceUrl={openUrlForm}
      onMention={insertMention}
      onFocusSelection={onFocusSelection}
      onMode={setMode}
      onOpenSkills={openSkills}
      project={project}
      reasonId={reasonId}
      send={sendProps}
      spoken={spoken}
    />
  );
};

export { PromptToolbarRow };
