import type { ReactElement } from "react";

import type { StackingInfo } from "./deps.js";
import { InsetFields } from "./inset-fields.js";
import { OverflowSelect } from "./overflow-select.js";
import { PositionSelect } from "./position-select.js";
import { isInsetShown, positionOf, shownValue } from "./stacking-model.js";
import type { StackingHandlers } from "./use-stacking-handlers.js";
import { ZIndexField } from "./z-index-field.js";

import styles from "./stacking.module.css";

interface StackingBodyProps {
  readonly disabled: boolean;
  readonly handlers: StackingHandlers;
  readonly info: StackingInfo;
}

const StackingBody = ({
  disabled,
  handlers,
  info,
}: StackingBodyProps): ReactElement => {
  const position = positionOf(info);

  return (
    <div className={styles.body}>
      <PositionSelect
        disabled={disabled}
        value={position}
        onPick={handlers.handlePosition}
      />
      {isInsetShown(position) && (
        <InsetFields
          disabled={disabled}
          info={info}
          onCommit={handlers.handleInset}
        />
      )}
      <div className="ins-grid">
        <OverflowSelect
          axis="overflowX"
          disabled={disabled}
          value={info.overflowX.value ?? ""}
          onPick={handlers.handleOverflow}
        />
        <OverflowSelect
          axis="overflowY"
          disabled={disabled}
          value={info.overflowY.value ?? ""}
          onPick={handlers.handleOverflow}
        />
      </div>
      <ZIndexField
        disabled={disabled}
        value={shownValue(info.zIndex)}
        onCommit={handlers.handleZIndex}
      />
    </div>
  );
};

export { StackingBody };
