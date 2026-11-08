import { Suspense, useCallback, useMemo } from "react";
import type { MouseEvent, ReactElement } from "react";

import { Composer } from "../../ai/components/ai/composer.js";
import { findElement } from "../../platform/find-element.js";
import { SelectionChips, AttachmentThumbs } from "./composer-parts.js";
import { MentionChips } from "./mention-chips.js";
import { RepoContextChip } from "./prompt-box-model.js";
import type { PromptBoxProps } from "./prompt-box-props.js";
import { toDropClass } from "./prompt-send-model.js";
import { PromptTextInput } from "./prompt-text-input.js";
import { PromptToolbarRow } from "./prompt-toolbar-row.js";
import { RunContextChip } from "./run-context-chip.js";
import { SkillChips } from "./skill-chips.js";
import type { PromptBase } from "./use-prompt-base.js";
import type { PromptInput } from "./use-prompt-input.js";
import type { PromptSending, PromptLink } from "./use-prompt-sending.js";
import type { PromptSlash } from "./use-prompt-slash.js";

type CommentsComponent = (props: {
  readonly count: number;
  readonly onClear: () => void;
}) => ReactElement | null;

const PromptComposer = ({
  box,
  base,
  input,
  slash,
  sending,
  prefill,
  Comments,
}: {
  box: PromptBoxProps;
  base: PromptBase;
  input: PromptInput;
  slash: PromptSlash;
  sending: PromptSending;
  prefill: PromptLink;
  Comments: CommentsComponent;
}): ReactElement => {
  const parts = useMemo(
    () => ({ base, box, input, sending, slash }),
    [base, box, input, sending, slash]
  );

  const { files, isDragging, removeFile, setSkillIds, skillIds } = base;
  const { mentions } = input;
  const { remove: removeMention } = mentions;
  const { clear: clearPrefill } = prefill;
  const { onRemoveSelection } = box;

  const focusInput = useCallback((event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      findElement(event.currentTarget, "textarea")?.focus();
    }
  }, []);

  const removeSkill = useCallback(
    (id: string): void =>
      setSkillIds((previous) => previous.filter((entry) => entry !== id)),
    [setSkillIds]
  );

  return (
    <Composer
      extraClass={toDropClass(isDragging, "composer ui-composer cursor-text")}
      onClick={focusInput}
    >
      <RunContextChip chip={box.canvasChip} />
      <Suspense fallback={null}>
        <RepoContextChip
          projectId={box.projectId}
          directionId={box.directionId}
        />
      </Suspense>
      <SelectionChips selection={box.selection} onRemove={onRemoveSelection} />
      <Comments count={prefill.linked.length} onClear={clearPrefill} />
      <AttachmentThumbs files={files} onRemove={removeFile} />
      <MentionChips mentions={mentions.mentions} onRemove={removeMention} />
      <SkillChips ids={skillIds} onRemove={removeSkill} />
      <PromptTextInput
        box={box}
        base={base}
        input={input}
        slash={slash}
        sending={sending}
      />
      <PromptToolbarRow parts={parts} />
    </Composer>
  );
};

export { PromptComposer };

export type { CommentsComponent };
