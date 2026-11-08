import { UiSelect } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { WidthOption } from "./variant-bar-model.js";

interface Props {
  readonly value: string;
  readonly options: readonly WidthOption[];
  readonly onChange: (name: string) => void;
}

const WIDTH_TIP = "Edit styles from this width up. The frame resizes to it";

const VariantWidthSelect = ({
  value,
  options,
  onChange,
}: Props): ReactElement => (
  <div className="ins-variant-width">
    <UiSelect
      size="sm"
      aria-label={copy.breakpoint}
      tip={WIDTH_TIP}
      value={value}
      options={options}
      onChange={onChange}
    />
  </div>
);

export { VariantWidthSelect };
