import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ScaleFieldTokens } from "./scale-field-tokens.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useScaleField } from "./use-scale-field.js";

const ScaleField = ({
  edit,
  selection,
}: {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
}): ReactElement => {
  const {
    draft,
    handleDraftInput,
    handleKeyDown,
    handleScrubDown,
    handleScrubMove,
    handleScrubUp,
    handleToggleTokens,
    inputRef,
    isDisabled,
    note,
    shouldKeepTokens,
  } = useScaleField(edit, selection);

  return (
    <div className="ins-grid">
      <div className="ins-field">
        <label
          htmlFor="ins-scale"
          className="ins-scrub"
          role="presentation"
          data-tip={copy.scaleField}
          onPointerDown={handleScrubDown}
          onPointerMove={handleScrubMove}
          onPointerUp={handleScrubUp}
        >
          {copy.scale}
        </label>
        <input
          ref={inputRef}
          id="ins-scale"
          className="ins-input num"
          aria-label={copy.scaleField}
          value={`${draft}%`}
          spellCheck={false}
          autoComplete="off"
          disabled={isDisabled}
          onChange={handleDraftInput}
          onKeyDown={handleKeyDown}
        />
      </div>
      <ScaleFieldTokens isOn={shouldKeepTokens} onToggle={handleToggleTokens} />
      {note !== null && <output className="ins-note wide">{note}</output>}
    </div>
  );
};

export { ScaleField };
