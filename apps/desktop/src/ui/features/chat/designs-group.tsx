import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { designsHint } from "./run-settings-model.js";
import type { DesignsSetting } from "./run-settings-model.js";

type DesignsControlType = (props: {
  value: number;
  max: number;
  onChange: (count: number) => void;
  disabled: boolean;
  labelledBy: string;
}) => ReactElement;

const DesignsGroup = ({
  designs,
  labelId,
  Control,
}: {
  designs: DesignsSetting;
  labelId: string;
  Control: DesignsControlType;
}): ReactElement => {
  const { onChange } = designs;

  return (
    <section className="rs-group">
      <h3 className="rs-label" id={labelId}>
        {copy.designs}
      </h3>
      <Control
        value={designs.value}
        max={designs.max}
        onChange={onChange}
        disabled={designs.disabledReason !== null}
        labelledBy={labelId}
      />
      <p className="rs-hint">{designsHint(designs)}</p>
    </section>
  );
};

export { DesignsGroup };

export type { DesignsControlType };
