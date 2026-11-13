import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { useDocumentBody } from "../../platform/document-body.js";
import { copy } from "./copy.js";
import { useImageDropPrompt } from "./use-image-paste.js";
import type { ImageDropControl } from "./use-image-paste.js";

interface ImageDropGhostProps {
  readonly control: ImageDropControl;
}

const ImageDropGhost = ({
  control,
}: ImageDropGhostProps): ReactElement | null => {
  const body = useDocumentBody();
  const prompt = useImageDropPrompt(control);
  const { focusInput } = prompt;
  const { drop, isPending } = control;

  if (drop === null || body === null) {
    return null;
  }

  const layer = (
    <div className="image-drop-layer">
      {prompt.ghostStyle && (
        <div
          className="image-drop-ghost"
          style={prompt.ghostStyle}
          aria-hidden="true"
        >
          <img className="image-drop-picture" src={drop.url} alt="" />
        </div>
      )}
      <form
        className="image-drop-prompt"
        style={prompt.promptStyle}
        onSubmit={prompt.handlePromptSubmit}
        data-testid="image-drop-prompt"
      >
        <label className="image-drop-question" htmlFor="image-drop-input">
          {copy.imageDropAsk}
        </label>
        <input
          ref={focusInput}
          id="image-drop-input"
          className="image-drop-input"
          value={prompt.text}
          placeholder={copy.imageDropPlaceholder}
          onChange={prompt.handleTextInput}
          onKeyDown={prompt.handleEscapeKey}
          disabled={isPending}
          autoComplete="off"
        />
        <span className="image-drop-hint">{copy.imageDropHint}</span>
      </form>
    </div>
  );

  return <>{createPortal(layer, body)}</>;
};

export { ImageDropGhost };
