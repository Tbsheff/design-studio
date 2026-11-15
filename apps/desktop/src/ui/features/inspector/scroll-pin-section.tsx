import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { InsetField } from "./inset-field.js";
import { InspectorSection } from "./inspector-fields.js";
import type { InspectorProps } from "./inspector-model.js";
import { ScrollPinChoices } from "./scroll-pin-choices.js";
import {
  FIXED_SIDE_OPTIONS,
  SCROLL_PIN_OPTIONS,
  SCROLL_PIN_TEXT,
} from "./scroll-pin-model.js";
import { useScrollPin } from "./use-scroll-pin.js";

const ScrollPinSection = ({
  props,
}: {
  readonly props: InspectorProps;
}): ReactElement => {
  const pin = useScrollPin(props);

  return (
    <InspectorSection title={copy.scrollPinTitle} modifier="ins-scroll-pin">
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
      {pin.blocked !== null && (
        <p className="ins-scroll-pin-note">{pin.blocked}</p>
      )}
      <p className="ins-scroll-pin-note">{copy.scrollPinHint}</p>
    </InspectorSection>
  );
};

export { ScrollPinSection };
