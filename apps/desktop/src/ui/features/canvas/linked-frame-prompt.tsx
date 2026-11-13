import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { useDocumentBody } from "../../platform/document-body.js";
import { copy } from "./copy.js";
import { toLinkedQuestion } from "./linked-frame-model.js";
import { useLinkedFramePrompt } from "./use-linked-frame-prompt.js";
import type { LinkedFrameControl } from "./use-linked-frame.js";

interface LinkedFramePromptProps {
  readonly control: LinkedFrameControl;
}

const LinkedFramePrompt = ({
  control,
}: LinkedFramePromptProps): ReactElement | null => {
  const body = useDocumentBody();
  const prompt = useLinkedFramePrompt(control);
  const { focusInput } = prompt;
  const { drop, isPending } = control;

  if (drop === null || body === null) {
    return null;
  }

  const layer = (
    <div className="linked-frame-layer">
      {prompt.ghostStyle && (
        <div
          className="linked-frame-ghost"
          style={prompt.ghostStyle}
          aria-hidden="true"
        />
      )}
      <form
        className="linked-frame-prompt"
        style={prompt.promptStyle}
        onSubmit={prompt.handlePromptSubmit}
        data-testid="linked-frame-prompt"
      >
        <label className="linked-frame-question" htmlFor="linked-frame-input">
          {toLinkedQuestion(drop.selection)}
        </label>
        <input
          ref={focusInput}
          id="linked-frame-input"
          className="linked-frame-input"
          value={prompt.text}
          placeholder={copy.linkedFramePlaceholder}
          onChange={prompt.handleTextInput}
          onKeyDown={prompt.handleEscapeKey}
          disabled={isPending}
          autoComplete="off"
        />
        <span className="linked-frame-hint">{copy.linkedFrameHint}</span>
      </form>
    </div>
  );

  return <>{createPortal(layer, body)}</>;
};

export { LinkedFramePrompt };
