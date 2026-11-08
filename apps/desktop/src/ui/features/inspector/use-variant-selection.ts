import type {
  ComponentInstance,
  VariantGroup,
  VariantOption,
} from "@design-studio/contracts/props";
import { useCallback, useMemo, useState } from "react";

import { toInitialValue } from "./props-model.js";

interface PickedValue {
  readonly from: string;
  readonly value: string;
}

interface VariantSelection {
  readonly groups: VariantGroup[];
  readonly group: VariantGroup | null;
  readonly option: VariantOption | null;
  readonly classNames: string[];
  readonly onProp: (prop: string) => void;
  readonly onValue: (value: string) => void;
}

const NO_GROUPS: VariantGroup[] = [];

const toPickedValue = (current: string, picked: PickedValue | null): string => {
  if (picked?.from === current) {
    return picked.value;
  }

  return current;
};

const useVariantSelection = (instance: ComponentInstance): VariantSelection => {
  const groups = instance.component?.cva?.variants ?? NO_GROUPS;
  const [prop, setProp] = useState(groups[0]?.prop ?? "");
  const [picked, setPicked] = useState<PickedValue | null>(null);

  const group =
    groups.find((entry) => entry.prop === prop) ?? groups[0] ?? null;

  const current = toInitialValue(instance, group);
  const value = toPickedValue(current, picked);

  const option =
    group?.options.find((entry) => entry.value === value) ??
    group?.options[0] ??
    null;

  const classes = option?.classes ?? "";

  const classNames = useMemo(
    () => classes.split(/\s+/u).filter(Boolean),
    [classes]
  );

  const onValue = useCallback(
    (next: string) => setPicked({ from: current, value: next }),
    [current]
  );

  const onProp = setProp;

  return { classNames, group, groups, onProp, onValue, option };
};

export { useVariantSelection };
