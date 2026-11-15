import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { RenameManyField } from "./rename-many-field.js";
import { RenameManyPair } from "./rename-many-pair.js";
import { RenameManyPreview } from "./rename-many-preview.js";
import type { RenameManyApi } from "./use-rename-many.js";

interface RenameManyPopupProps {
  readonly many: RenameManyApi;
}

const RenameManyPopup = ({ many }: RenameManyPopupProps): ReactNode => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, []);

  return (
    <div className="layers-rename-anchor">
      <form
        className="ui-menu layers-rename-popup"
        aria-label={COPY.renameManyLabel}
        onSubmit={many.handleSubmit}
      >
        <RenameManyField
          inputRef={inputRef}
          isDisabled={many.fields.find !== ""}
          label={COPY.renameManyTo}
          name="rename-to"
          value={many.fields.pattern}
          onValueChange={many.fields.handlePatternChange}
          onFieldKeyDown={many.handleKeyDown}
        />
        <RenameManyPair many={many} />
        <p className="layers-rename-hint">{COPY.renameManyHint}</p>
        {many.isTooMany && (
          <p className="layers-rename-error" role="alert">
            {COPY.renameManyTooMany}
          </p>
        )}
        <RenameManyPreview preview={many.preview} />
        <button
          type="submit"
          className="btn small primary layers-rename-apply"
          disabled={many.isTooMany}
        >
          {COPY.renameManyApply}
        </button>
      </form>
    </div>
  );
};

export { RenameManyPopup };
