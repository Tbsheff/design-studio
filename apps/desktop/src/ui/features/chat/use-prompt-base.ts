import type { RunEffort } from "@design-studio/contracts";
import { useId, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { toDroppedFiles } from "../../domain/reference-files.js";
import { useDraft } from "../../platform/storage.js";
import { useComposerFocus } from "./composer-focus.js";
import type { ComposerMode } from "./composer-mode-model.js";
import type { ComposerSheetState } from "./composer-sheet-model.js";
import type { PromptBoxProps } from "./prompt-box-props.js";
import { useComposerSheet } from "./use-composer-sheet.js";
import { useModelChoice } from "./use-model-choice.js";
import { FILE_RULES, usePromptFiles } from "./use-prompt-files.js";
import { usePromptReferences } from "./use-prompt-references.js";
import type { PromptReferences } from "./use-prompt-references.js";
import { useRunLevel } from "./use-run-level.js";
import type { RunLevelState } from "./use-run-level.js";

interface PromptBase {
  readonly addFiles: (list: Iterable<File>) => void;
  readonly chooseModel: (model: string) => void;
  readonly draft: string;
  readonly effort: RunEffort | null;
  readonly error: string | null;
  readonly files: PendingAttachment[];
  readonly isDragging: boolean;
  readonly mode: ComposerMode;
  readonly promptRef: RefObject<HTMLDivElement | null>;
  readonly reasonId: string;
  readonly references: PromptReferences;
  readonly removeFile: (localId: string) => void;
  readonly runLevel: RunLevelState;
  readonly setDraft: (value: string) => void;
  readonly setEffort: Dispatch<SetStateAction<RunEffort | null>>;
  readonly setError: (message: string | null) => void;
  readonly setFiles: Dispatch<SetStateAction<PendingAttachment[]>>;
  readonly setIsDragging: Dispatch<SetStateAction<boolean>>;
  readonly setMode: Dispatch<SetStateAction<ComposerMode>>;
  readonly setSkillIds: Dispatch<SetStateAction<string[]>>;
  readonly sheet: ComposerSheetState;
  readonly skillIds: string[];
  readonly uploading: boolean;
}

const usePromptBase = (props: PromptBoxProps): PromptBase => {
  const [mode, setMode] = useState<ComposerMode>("edit");
  const [effort, setEffort] = useState<RunEffort | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const reasonId = useId();
  const promptRef = useRef<HTMLDivElement>(null);
  const sheet = useComposerSheet();

  const runLevel = useRunLevel(
    props.projectId,
    props.settings.defaultLevel,
    props.onSettingsSaved
  );

  const draft = useDraft(props.draft);
  const setDraft = props.draft.set;

  const chooseModel = useModelChoice(
    props.projectId,
    props.model,
    props.onSettingsSaved,
    setError
  );

  const {
    addFiles: addImageFiles,
    files,
    removeFile,
    setFiles,
    uploading,
  } = usePromptFiles(props.projectId, setError, FILE_RULES);

  const references = usePromptReferences(props.projectId, setError);
  const { addReferenceFiles } = references;

  const addFiles = (list: Iterable<File>): void => {
    const dropped = toDroppedFiles(list);
    addImageFiles([...dropped.images, ...dropped.others]);
    addReferenceFiles(dropped.references);
  };

  useComposerFocus(props.running, !props.disabled);

  return {
    addFiles,
    chooseModel,
    draft,
    effort,
    error,
    files,
    isDragging,
    mode,
    promptRef,
    reasonId,
    references,
    removeFile,
    runLevel,
    setDraft,
    setEffort,
    setError,
    setFiles,
    setIsDragging,
    setMode,
    setSkillIds,
    sheet,
    skillIds,
    uploading,
  };
};

export { usePromptBase };

export type { PromptBase };
