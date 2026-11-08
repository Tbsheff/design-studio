import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";
import type { PortForm } from "./use-port-form.js";

const FrameField = ({
  form,
  isMulti,
}: {
  form: PortForm;
  isMulti: boolean;
}): ReactElement => {
  const { frames, frameId, setFrameId } = form;

  const options = useMemo<UiSelectOption[]>(
    () =>
      frames.map((choice) => ({
        label: choice.label,
        value: choice.id,
      })),
    [frames]
  );

  return (
    <div className="field">
      <span id="port-frame-label">
        {toChoice(isMulti, COPY.textFirstPage, COPY.textFrame)}
      </span>
      <UiSelect
        aria-labelledby="port-frame-label"
        value={frameId}
        options={options}
        onChange={setFrameId}
      />
    </div>
  );
};

export { FrameField };
