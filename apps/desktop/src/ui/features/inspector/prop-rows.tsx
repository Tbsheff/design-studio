import type {
  ComponentInstance,
  ComponentSchema,
  PropValue,
} from "@design-studio/contracts/props";
import { useMemo } from "react";
import type { ReactElement } from "react";

import type { SheetMode } from "./author-model.js";
import { PropRow } from "./prop-row.js";
import { VariantPropGroup } from "./variant-prop-group.js";

interface PropRowsProps {
  readonly instance: ComponentInstance;
  readonly component: ComponentSchema;
  readonly isDisabled: boolean;
  readonly onChange: (name: string, value: PropValue | null) => void;
  readonly onAuthor: ((prop: string, mode: SheetMode) => void) | null;
}

const PropRows = ({
  instance,
  component,
  isDisabled,
  onChange,
  onAuthor,
}: PropRowsProps): ReactElement => {
  const variants = useMemo(
    () => component.props.filter((spec) => spec.from === "variant"),
    [component.props]
  );

  const others = useMemo(
    () => component.props.filter((spec) => spec.from !== "variant"),
    [component.props]
  );

  return (
    <>
      {variants.length > 0 && (
        <VariantPropGroup
          instance={instance}
          component={component}
          specs={variants}
          isDisabled={isDisabled}
          onChange={onChange}
          onAuthor={onAuthor}
        />
      )}
      {others.length > 0 && (
        <div className="prp-rows">
          {others.map((spec) => (
            <PropRow
              key={spec.name}
              instance={instance}
              spec={spec}
              isDisabled={isDisabled}
              onChange={onChange}
              onAuthor={null}
            />
          ))}
        </div>
      )}
    </>
  );
};

export { PropRows };
