import type {
  ComponentInstance,
  ComponentSchema,
  PropSpec,
  PropValue,
} from "@design-studio/contracts/props";
import type { ReactElement } from "react";

import type { SheetMode } from "./author-model.js";
import { copy } from "./copy.js";
import { PropRow } from "./prop-row.js";

interface VariantPropGroupProps {
  readonly instance: ComponentInstance;
  readonly component: ComponentSchema;
  readonly specs: PropSpec[];
  readonly isDisabled: boolean;
  readonly onChange: (name: string, value: PropValue | null) => void;
  readonly onAuthor: ((prop: string, mode: SheetMode) => void) | null;
}

const VariantPropGroup = ({
  instance,
  component,
  specs,
  isDisabled,
  onChange,
  onAuthor,
}: VariantPropGroupProps): ReactElement => (
  <div className="prp-variant-group">
    <span className="prp-group-label">{copy.variant}</span>
    <div className="prp-rows">
      {specs.map((spec) => (
        <PropRow
          key={spec.name}
          instance={instance}
          spec={spec}
          isDisabled={isDisabled}
          onChange={onChange}
          onAuthor={
            (component.cva?.variants.some(
              (group) => group.prop === spec.name
            ) &&
              onAuthor) ||
            null
          }
        />
      ))}
    </div>
  </div>
);

export { VariantPropGroup };
