import type { RunEffort, RunLevel } from "@design-studio/contracts";
import { useCallback, useMemo, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import type { PlusMenuProps } from "./composer-menu-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { DesignsChip } from "./designs-chip.js";
import { LevelPill } from "./level-pill.js";
import { ModeChip } from "./mode-chip.js";
import { ModelPill } from "./model-pill.js";
import { PlusMenu } from "./plus-menu.js";
import type { SendProps } from "./prompt-box-model.js";
import { ReasonText } from "./reason-text.js";
import { ReferenceFileInput } from "./reference-file-input.js";
import { SendButton } from "./send-button.js";

const TOOLBAR_CLASS = cn(
  "flex items-center gap-1.5 px-3 py-2",
  "prompt-bar cursor-default gap-1 px-2 pt-0 pb-2"
);

const SPACER_CLASS = cn(
  "ml-auto flex items-center gap-1.5",
  "prompt-send gap-1"
);

const ACCEPTED_IMAGES = "image/png,image/jpeg,image/gif,image/webp";

interface PromptToolbarProps {
  readonly designs: PlusMenuProps["designs"];
  readonly effort: RunEffort | null;
  readonly level: RunLevel;
  readonly mode: ComposerMode;
  readonly model: string;
  readonly onChooseLevel: (level: RunLevel) => void;
  readonly onChooseModel: (model: string) => void;
  readonly onCloseSlash: () => void;
  readonly onEffort: (effort: RunEffort | null) => void;
  readonly onFiles: (files: File[]) => void;
  readonly onReferenceFiles: (files: File[]) => void;
  readonly onReferenceFolder: () => Promise<void>;
  readonly onReferenceUrl: () => void;
  readonly onMention: () => void;
  readonly onMode: (mode: ComposerMode) => void;
  readonly onOpenSkills: () => void;
  readonly reasonId: string;
  readonly send: SendProps;
  readonly spoken: string | null;
}

const PromptToolbar = (props: PromptToolbarProps): ReactElement => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { designs, mode, onMode, send } = props;
  const attach = useCallback((): void => inputRef.current?.click(), []);

  const referenceRef = useRef<HTMLInputElement>(null);
  const attachZip = useCallback((): void => referenceRef.current?.click(), []);
  const { onReferenceFiles, onReferenceFolder } = props;

  const resetMode = useCallback((): void => onMode("edit"), [onMode]);

  const clearDesigns = useCallback((): void => {
    designs?.onChange(1);
  }, [designs]);

  const { onFiles } = props;

  const pickFiles = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      if (event.target.files) {
        onFiles([...event.target.files]);
      }

      event.target.value = "";
    },
    [onFiles]
  );

  const { effort: effortValue, onEffort } = props;

  const effort = useMemo(
    () => ({ onChange: onEffort, value: effortValue }),
    [effortValue, onEffort]
  );

  return (
    <div data-slot="composer-toolbar" className={TOOLBAR_CLASS}>
      <PlusMenu
        onAttach={attach}
        onAttachFolder={onReferenceFolder}
        onAttachUrl={props.onReferenceUrl}
        onAttachZip={attachZip}
        onMention={props.onMention}
        onSkills={props.onOpenSkills}
        onOpen={props.onCloseSlash}
        mode={mode}
        onMode={onMode}
        designs={designs}
      />
      <ModeChip mode={mode} onClear={resetMode} />
      <DesignsChip designs={designs} onClear={clearDesigns} />
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGES}
        multiple
        hidden
        onChange={pickFiles}
      />
      <ReferenceFileInput inputRef={referenceRef} onFiles={onReferenceFiles} />
      <div data-slot="composer-toolbar-spacer" className={SPACER_CLASS}>
        <LevelPill
          level={props.level}
          onLevel={props.onChooseLevel}
          onOpen={props.onCloseSlash}
        />
        <ModelPill
          model={props.model}
          level={props.level}
          effort={effort}
          onModel={props.onChooseModel}
          onOpen={props.onCloseSlash}
        />
        <SendButton send={send} />
      </div>
      <ReasonText id={props.reasonId} text={props.spoken} />
    </div>
  );
};

export { PromptToolbar };
