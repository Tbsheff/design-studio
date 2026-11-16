import type { RunEffort, RunLevel } from "@design-studio/contracts";
import { useCallback, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import type { ComposerMode } from "./composer-mode-model.js";
import type { PlusProjectProps } from "./composer-sheet-model.js";
import { ContextMeter } from "./context-meter.js";
import { DraftsPill } from "./drafts-pill.js";
import { LevelPill } from "./level-pill.js";
import { ModePill } from "./mode-pill.js";
import { ModelPill } from "./model-pill.js";
import { PlusMenu } from "./plus-menu.js";
import type { SendProps } from "./prompt-box-model.js";
import { ReasonText } from "./reason-text.js";
import { ReferenceFileInput } from "./reference-file-input.js";
import type { DesignsSetting } from "./run-settings-model.js";
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
  readonly contextTokens: number | null;
  readonly contextWindow: number | null;
  readonly designs: DesignsSetting | undefined;
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
  readonly onFocusSelection: (() => void) | null;
  readonly onMode: (mode: ComposerMode) => void;
  readonly onOpenSkills: () => void;
  readonly project: PlusProjectProps;
  readonly reasonId: string;
  readonly send: SendProps;
  readonly spoken: string | null;
}

const PromptToolbar = (props: PromptToolbarProps): ReactElement => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { designs, send } = props;
  const attach = useCallback((): void => inputRef.current?.click(), []);

  const referenceRef = useRef<HTMLInputElement>(null);
  const attachZip = useCallback((): void => referenceRef.current?.click(), []);
  const { onFiles, onReferenceFiles, onReferenceFolder } = props;

  const pickFiles = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      if (event.target.files) {
        onFiles([...event.target.files]);
      }

      event.target.value = "";
    },
    [onFiles]
  );

  return (
    <div data-slot="composer-toolbar" className={TOOLBAR_CLASS}>
      <PlusMenu
        onAttach={attach}
        onAttachFolder={onReferenceFolder}
        onAttachUrl={props.onReferenceUrl}
        onAttachZip={attachZip}
        onMention={props.onMention}
        onFocusSelection={props.onFocusSelection}
        onSkills={props.onOpenSkills}
        onOpen={props.onCloseSlash}
        project={props.project}
      />
      <ModePill
        mode={props.mode}
        effort={props.effort}
        onMode={props.onMode}
        onEffort={props.onEffort}
        onOpen={props.onCloseSlash}
      />
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
        <ContextMeter
          tokens={props.contextTokens}
          window={props.contextWindow}
          model={props.model}
        />
        <LevelPill
          level={props.level}
          onLevel={props.onChooseLevel}
          onOpen={props.onCloseSlash}
        />
        <ModelPill
          model={props.model}
          level={props.level}
          onModel={props.onChooseModel}
          onOpen={props.onCloseSlash}
        />
        {designs && (
          <DraftsPill designs={designs} onOpen={props.onCloseSlash} />
        )}
        <SendButton send={send} />
      </div>
      <ReasonText id={props.reasonId} text={props.spoken} />
    </div>
  );
};

export { PromptToolbar };
