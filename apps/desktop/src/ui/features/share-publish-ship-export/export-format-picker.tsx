import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import type { DialogFormat } from "./export-formats.js";
import { pick } from "./pick.js";
import { Segmented } from "./segmented.js";
import type { SegmentOption } from "./segmented.js";

interface ExportFormatPickerProps {
  readonly main: readonly SegmentOption<DialogFormat>[];
  readonly more: readonly SegmentOption<DialogFormat>[];
  readonly value: DialogFormat;
  readonly onChange: (format: DialogFormat) => void;
}

const ExportFormatPicker = ({
  main,
  more,
  onChange,
  value,
}: ExportFormatPickerProps): ReactElement => {
  const isMoreFormat = more.some((option) => option.id === value);
  const [isOpen, setIsOpen] = useState(isMoreFormat);
  const toggle = useCallback((): void => setIsOpen((open) => !open), []);
  const isShown = isOpen || isMoreFormat;

  return (
    <div className="export-formats">
      <div className="export-formats-row">
        <Segmented
          label={uiCopy.formatLabel}
          value={value}
          options={main}
          onChange={onChange}
        />
        {!isMoreFormat && (
          <button
            type="button"
            className="btn ghost small"
            aria-expanded={isShown}
            onClick={toggle}
          >
            {pick(isShown, uiCopy.fewerFormats, uiCopy.moreFormats)}
          </button>
        )}
      </div>
      {isShown && (
        <Segmented
          label={uiCopy.moreFormatsLabel}
          value={value}
          options={more}
          onChange={onChange}
        />
      )}
    </div>
  );
};

export { ExportFormatPicker };
