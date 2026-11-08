import type {
  ComponentInstance,
  PropSpec,
  PropValue,
  SetPropsResult,
  VariantGroup,
} from "@design-studio/contracts/props";

import type { SheetMode } from "./author-model.js";

interface SheetTarget {
  readonly prop: string;
  readonly mode: SheetMode;
}

type PropsStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved"; readonly text: string }
  | { readonly kind: "error"; readonly text: string };

interface ClassBody {
  readonly style?: Record<string, string | null>;
  readonly classes?: { readonly add?: string[]; readonly remove?: string[] };
}

interface PaddingField {
  readonly label: string;
  readonly axis: string;
  readonly props: readonly string[];
}

const PADDING: readonly PaddingField[] = [
  { axis: "X", label: "Padding X", props: ["padding-left", "padding-right"] },
  { axis: "Y", label: "Padding Y", props: ["padding-top", "padding-bottom"] },
];

const toErrorMessage = (error: Error | string): string => {
  if (!(error instanceof Error)) {
    return error;
  }

  const { data } = error as { readonly data?: { readonly message?: string } };

  return data?.message ?? error.message;
};

const toPropValue = (
  instance: ComponentInstance,
  spec: PropSpec
): PropValue | null => instance.values[spec.name] ?? spec.default ?? null;

const toInitialValue = (
  instance: ComponentInstance,
  group: VariantGroup | null
): string => {
  if (!group) {
    return "";
  }

  return String(
    instance.values[group.prop] ??
      group.default ??
      group.options[0]?.value ??
      ""
  );
};

const toSelectList = (
  current: string,
  options: readonly string[]
): readonly string[] => {
  if (current && !options.includes(current)) {
    return [current, ...options];
  }

  return options;
};

const toOptionLabel = (option: string, spec: PropSpec): string => {
  if (option === spec.default && option !== "default") {
    return `${option} (default)`;
  }

  return option;
};

const toDraftText = (value: PropValue | null): string => {
  if (value === null) {
    return "";
  }

  return String(value);
};

const toPaddingStyle = (
  field: PaddingField,
  px: number | null
): Record<string, string | null> =>
  Object.fromEntries(
    field.props.map((name) => {
      if (px === null) {
        return [name, null];
      }

      return [name, `${px}px`];
    })
  );

const toUsesNote = (uses: number): string => {
  if (uses > 1) {
    return ` (${uses} uses in this project)`;
  }

  return "";
};

const toVariantWarning = (
  name: string,
  prop: string,
  value: string,
  uses: number
): string =>
  `This changes every ${name} with ${prop} “${value}”${toUsesNote(uses)}.`;

const toValuesWith = (
  instance: ComponentInstance,
  name: string,
  value: PropValue | null
): ComponentInstance["values"] => {
  if (value === null) {
    return Object.fromEntries(
      Object.entries(instance.values).filter(([key]) => key !== name)
    );
  }

  return { ...instance.values, [name]: value };
};

const toSavedStatus = (result: SetPropsResult): PropsStatus => {
  if (
    result.version &&
    (result.changed.length > 0 || result.removed.length > 0)
  ) {
    return { kind: "saved", text: result.version.title };
  }

  return { kind: "idle" };
};

export {
  PADDING,
  toSavedStatus,
  toValuesWith,
  toVariantWarning,
  toPaddingStyle,
  toDraftText,
  toErrorMessage,
  toInitialValue,
  toOptionLabel,
  toPropValue,
  toSelectList,
};

export type { ClassBody, PaddingField, PropsStatus, SheetTarget };
