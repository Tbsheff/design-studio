import { memo } from "react";
import type { ReactNode } from "react";

import { TokenDarkSlot } from "./token-dark-slot.js";
import { TokenRowHead } from "./token-row-head.js";
import { isRowChanged, toRowClass } from "./token-row-model.js";
import type { TokenRowProps } from "./token-row-types.js";
import { TokenValueEditor } from "./token-value-editor.js";

const TokenRowBase = (props: TokenRowProps): ReactNode => {
  const { entry, error, shown } = props;
  const isChanged = isRowChanged(props.pending);
  const isColor = entry.type === "color";
  const hasDark = isColor && props.showDark;
  let swatch: string | null = null;

  if (isColor) {
    swatch = props.swatchFor(shown.value, false);
  }

  return (
    <li className={toRowClass(isChanged, hasDark)} data-token={entry.cssVar}>
      <TokenRowHead isChanged={isChanged} row={props} swatch={swatch} />
      <div className="tkp-values">
        <TokenValueEditor
          entry={entry}
          shown={shown}
          error={error}
          swatchFor={props.swatchFor}
          onEdit={props.onEdit}
        />
        {hasDark && (
          <TokenDarkSlot
            entry={entry}
            shown={shown}
            swatchFor={props.swatchFor}
            onEdit={props.onEdit}
          />
        )}
      </div>
      {error && (
        <p className="tkp-error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
};

const TokenRow = memo(TokenRowBase);

export { TokenRow };
