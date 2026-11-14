import { UiSelect } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { dividerCopy } from "./copy.js";
import { DividerColorField } from "./divider-color-field.js";
import { WIDTHS } from "./divider-model.js";
import type { Divider } from "./divider-model.js";
import type { DividerView } from "./use-divider.js";

interface Props {
  readonly divider: Divider;
  readonly view: DividerView;
}

const DividerRow = ({ divider, view }: Props): ReactElement => {
  const { setColor, setWidth } = view;

  const applyWidth = useCallback(
    (next: string) => {
      const width = Number(next);

      if (width !== divider.width) {
        setWidth(width);
      }
    },
    [divider.width, setWidth]
  );

  if (!view.isEditable) {
    return (
      <p
        className="ins-note"
        data-tip={dividerCopy.reverseTip}
        data-tip-align="start"
      >
        {dividerCopy.linesBetween}
        {": "}
        {dividerCopy.editInCode}
      </p>
    );
  }

  return (
    <div className="ins-layout-row">
      <div className="ins-field select">
        <span className="ins-scrub static">{dividerCopy.width}</span>
        <UiSelect
          aria-label={dividerCopy.widthLabel}
          value={String(divider.width)}
          options={WIDTHS}
          onChange={applyWidth}
        />
      </div>
      <DividerColorField divider={divider} onColor={setColor} />
      {view.error !== null && <p className="ins-note error">{view.error}</p>}
    </div>
  );
};

export { DividerRow };
