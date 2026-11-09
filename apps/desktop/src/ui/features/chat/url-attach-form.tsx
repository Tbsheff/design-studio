import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useUrlAttach } from "./use-url-attach.js";

const UrlAttachForm = ({
  onAdd,
  onCancel,
}: {
  readonly onAdd: (url: string) => void;
  readonly onCancel: () => void;
}): ReactElement => {
  const { onText, onKey, onAddClick, inputRef, problem, value } = useUrlAttach(
    onAdd,
    onCancel
  );

  return (
    <fieldset className="url-attach" data-testid="url-attach">
      <legend className="sr-only">{copy.attachWebPage}</legend>
      <Icon name="globe" size={14} />
      <input
        ref={inputRef}
        type="url"
        className="url-attach-input"
        value={value}
        placeholder={copy.webPageUrlPlaceholder}
        aria-label={copy.webPageUrlLabel}
        aria-invalid={problem !== null}
        data-testid="url-attach-input"
        onChange={onText}
        onKeyDown={onKey}
      />
      <button
        type="button"
        className="btn small primary"
        data-testid="url-attach-add"
        onClick={onAddClick}
      >
        {copy.webPageAdd}
      </button>
      <button type="button" className="btn small ghost" onClick={onCancel}>
        {copy.webPageCancel}
      </button>
      {problem !== null && (
        <span className="url-attach-problem" role="alert">
          {problem}
        </span>
      )}
    </fieldset>
  );
};

export { UrlAttachForm };
