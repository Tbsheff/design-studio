import type {
  DirectStyleProperty,
  SelectionContext,
  TailwindOutcome,
} from "@design-studio/contracts";
import type { SharedSource } from "@design-studio/contracts/app";
import type { MutableRefObject, ReactNode } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { toMaxWidth, toSideWidths } from "./border-side-model.js";
import type { DeclaredMargins } from "./box-model-model.js";
import { copy } from "./copy.js";
import { SIDES } from "./css-value-model.js";
import type { StyleValues } from "./css-value-model.js";
import type {
  DesignTokens,
  DirectEdit,
  DirectEditCommit,
  DirectEditControl,
  SaveStatus,
  AuthoredCssState,
  VariantScope,
} from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import type { NumberSpec } from "./number-field-model.js";
import type {
  ScopeInput,
  UseInspectorTokensResult,
} from "./token-scope-model.js";

const TEXT_SHADOW = "text-shadow";

interface NumberFieldConfig {
  readonly short: string;
  readonly spec: Omit<NumberSpec, "edit">;
}

type Extra = "shadow" | "text-shadow" | "transform" | "filter";

interface ExtraEntry {
  readonly id: Extra;
  readonly label: string;
}

interface EditorProps {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly onCommitted: (commit: DirectEditCommit) => void;
  readonly onStale: (message: string) => void;
  readonly tokens: DesignTokens | null;
}

interface SharedEditing {
  readonly shared: SharedSource;
  readonly isEditingUse: boolean;
  readonly onToggle: () => void;
}

interface SimpleEditorProps extends EditorProps {
  readonly target: SelectionContext;
  readonly sharedEditing: SharedEditing | null;
  readonly component: ReactNode;
  readonly trailing: ReactNode;
}

type MultiEdit = DirectEdit & { readonly blocked: string | null };

interface SimpleEditorState {
  readonly authored: AuthoredCssState;
  readonly classLine: TailwindOutcome | null;
  readonly classes: ElementClasses;
  readonly edit: DirectEdit;
  readonly keepRaw: (raw: Partial<StyleValues>) => void;
  readonly scope: ScopeInput;
  readonly tokens: UseInspectorTokensResult;
  readonly variantScope: VariantScope;
}

const WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
const BORDER_STYLES = ["none", "solid", "dashed", "dotted", "double"];
const CASES = ["none", "uppercase", "lowercase", "capitalize"];
const OVERFLOWS = ["visible", "hidden", "clip", "scroll", "auto"];

const NEW_BORDER = {
  "border-color": "#d0d0d0",
  "border-style": "solid",
  "border-width": "1px",
};

const FONT_SIZE: NumberFieldConfig = {
  short: "Size",
  spec: { label: "Font size", min: 0, prop: "font-size" },
};

const LINE_HEIGHT: NumberFieldConfig = {
  short: "Leading",
  spec: {
    label: "Line height",
    min: 0,
    prop: "line-height",
    step: 0.1,
    unit: "",
  },
};

const LETTER_SPACING: NumberFieldConfig = {
  short: "Tracking",
  spec: { label: "Letter spacing", prop: "letter-spacing", step: 0.1 },
};

const OPACITY: NumberFieldConfig = {
  short: "Opacity",
  spec: {
    label: "Opacity",
    max: 100,
    min: 0,
    prop: "opacity",
    step: 5,
    unit: "%",
  },
};

const WIDTH: NumberFieldConfig = {
  short: "W",
  spec: { label: "Width", min: 0, prop: "width" },
};

const HEIGHT: NumberFieldConfig = {
  short: "H",
  spec: { label: "Height", min: 0, prop: "height" },
};

interface ExtraRow {
  readonly extra: Extra;
  readonly prop: "text-shadow" | "transform" | "filter";
  readonly label: string;
  readonly placeholder: string;
}

const EXTRA_ROWS: readonly ExtraRow[] = [
  {
    extra: TEXT_SHADOW,
    label: copy.extraTextShadow,
    placeholder: copy.text01px2px0003,
    prop: TEXT_SHADOW,
  },
  {
    extra: "transform",
    label: copy.extraTransform,
    placeholder: copy.rotate4deg,
    prop: "transform",
  },
  {
    extra: "filter",
    label: copy.extraFilter,
    placeholder: copy.blur4px,
    prop: "filter",
  },
];

const SHADOW_PRESET = "0px 2px 8px 0px rgba(0, 0, 0, 0.16)";

const EXTRAS: readonly ExtraEntry[] = [
  { id: "shadow", label: copy.extraShadow },
  { id: TEXT_SHADOW, label: copy.extraTextShadow },
  { id: "transform", label: copy.extraTransform },
  { id: "filter", label: copy.extraFilter },
];

const BOX_PROPS = (["margin", "padding"] as const).flatMap((box) =>
  SIDES.map((side) => `${box}-${side}` as DirectStyleProperty)
);

const toDeclaredMargins = (
  selection: SelectionContext | null
): DeclaredMargins => {
  if (!selection) {
    return {};
  }

  return Object.fromEntries(
    SIDES.map((side) => [
      side,
      selection.styles[`declared-margin-${side}`] ?? "",
    ])
  );
};

const isSet = (value: string): boolean =>
  value !== "" && value !== "none" && value !== "normal";

const toExtrasInUse = (edit: DirectEdit): Set<Extra> => {
  const used = new Set<Extra>();

  if (isSet(edit.values["box-shadow"]) || edit.mixed.has("box-shadow")) {
    used.add("shadow");
  }

  if (isSet(edit.values[TEXT_SHADOW])) {
    used.add(TEXT_SHADOW);
  }

  if (isSet(edit.values.transform)) {
    used.add("transform");
  }

  if (isSet(edit.values.filter)) {
    used.add("filter");
  }

  return used;
};

const hasBorder = (edit: DirectEdit): boolean => {
  const style = edit.values["border-style"];

  const width = toMaxWidth(toSideWidths(edit.values, edit.dirty));

  return (
    (style !== "" && style !== "none" && width > 0) ||
    edit.mixed.has("border-width")
  );
};

const toSavedAt = (status: SaveStatus): number => {
  if (status.kind === "saved") {
    return status.at;
  }

  return 0;
};

const applyEdit = (
  edit: DirectEdit,
  patch: Parameters<DirectEdit["preview"]>[0]
): void => {
  edit.preview(patch);
  edit.commit();
};

export {
  BORDER_STYLES,
  BOX_PROPS,
  CASES,
  EXTRAS,
  EXTRA_ROWS,
  FONT_SIZE,
  HEIGHT,
  LETTER_SPACING,
  LINE_HEIGHT,
  NEW_BORDER,
  OPACITY,
  OVERFLOWS,
  SHADOW_PRESET,
  WEIGHTS,
  WIDTH,
  applyEdit,
  hasBorder,
  toDeclaredMargins,
  toSavedAt,
  toExtrasInUse,
};

export type {
  EditorProps,
  Extra,
  MultiEdit,
  NumberFieldConfig,
  SharedEditing,
  SimpleEditorProps,
  SimpleEditorState,
};
