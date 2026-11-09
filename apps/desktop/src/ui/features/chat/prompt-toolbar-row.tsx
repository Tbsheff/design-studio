import type { ReactElement } from "react";

import type { PromptParts } from "./prompt-parts.js";
import { PromptToolbar } from "./prompt-toolbar.js";
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
  const { spoken } = sending.status;

  return (
    <PromptToolbar
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
      onMode={setMode}
      onOpenSkills={openSkills}
      reasonId={reasonId}
      send={sendProps}
      spoken={spoken}
    />
  );
};

export { PromptToolbarRow };
