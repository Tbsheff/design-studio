import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { TokenControl } from "./deps.js";
import type { DirectEdit } from "./deps.js";
import { FontListPopup } from "./font-list-popup.js";
import { useFontField } from "./use-font-field.js";
import type { TokenUi } from "./use-token-snap.js";

const toPlaceholder = (isMixed: boolean): string => {
  if (isMixed) {
    return copy.mixed;
  }

  return copy.emDash;
};

const FontField = ({
  ui,
  edit,
}: {
  readonly ui: TokenUi | null;
  readonly edit: DirectEdit;
}): ReactElement => {
  const field = useFontField(ui, edit);

  return (
    <div className="ins-field font cls-suggest-host">
      <label htmlFor="ins-font-family" className="ins-scrub static">
        {copy.font}
      </label>
      <input
        id="ins-font-family"
        className="ins-input"
        aria-label={copy.fontFamily}
        value={field.shownText}
        data-tip={field.tip}
        spellCheck={false}
        autoComplete="off"
        placeholder={toPlaceholder(field.isMixed)}
        onChange={field.handleChange}
        onClick={field.handleClick}
        onKeyDown={field.handleKeyDown}
        onBlur={field.handleBlur}
      />
      <TokenControl prop="font-family" label={copy.fontFamily} edit={edit} />
      {field.isOpen && (
        <FontListPopup
          active={field.active}
          rows={field.rows}
          onPick={field.handlePick}
        />
      )}
    </div>
  );
};

export { FontField };
