import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { InsetField } from "./inset-field.js";
import { ScrollPinChoices } from "./scroll-pin-choices.js";
import {
  FIXED_SIDE_OPTIONS,
  SCROLL_PIN_OPTIONS,
  SCROLL_PIN_TEXT,
} from "./scroll-pin-model.js";
import { useScrollPin } from "./use-scroll-pin.js";

interface ScrollPinRowsProps {
  readonly edit: DirectEdit;
  readonly styles: Readonly<Record<string, string>> | null;
}

const ScrollPinRows = ({ edit, styles }: ScrollPinRowsProps): ReactElement => {
  const pin = useScrollPin(edit, styles);
  const isPinned = pin.choice === "fixed" || pin.choice === "sticky";

  return (
    <div className="ins-scroll-pin">
      <ScrollPinChoices
        label={SCROLL_PIN_TEXT.position}
        locked={pin.locked}
        lockedTip={copy.scrollPinAbsoluteTip}
        options={SCROLL_PIN_OPTIONS}
        value={pin.choice ?? ""}
        onPick={pin.handlePick}
      />
      {pin.choice === "fixed" && (
        <ScrollPinChoices
          label={SCROLL_PIN_TEXT.pin}
          locked={null}
          lockedTip=""
          options={FIXED_SIDE_OPTIONS}
          value={pin.side}
          onPick={pin.handleSide}
        />
      )}
      {pin.offset !== null && (
        <div className="ins-grid">
          <InsetField edit={pin.edit} prop={pin.offset} />
        </div>
      )}
      {isPinned && <p className="ins-scroll-pin-note">{copy.scrollPinHint}</p>}
    </div>
  );
};

export { ScrollPinRows };
