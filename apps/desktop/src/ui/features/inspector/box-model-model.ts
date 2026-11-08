import type { DirectStyleProperty } from "@design-studio/contracts";

import { SIDES } from "./css-value-model.js";
import type { Side } from "./css-value-model.js";
import type { DirectEdit } from "./deps.js";
import type { NumberSpec } from "./number-field-model.js";

type Box = "padding" | "margin";

type DeclaredMargins = Partial<Record<Side, string>>;

interface SideSpecOptions {
  readonly box: Box;
  readonly display: string | null;
  readonly edit: DirectEdit;
  readonly label: string;
  readonly prop: DirectStyleProperty;
  readonly targets: DirectStyleProperty[];
}

const NO_MARGINS: DeclaredMargins = {};

const SIDE_LABEL: Record<Side, string> = {
  bottom: "bottom",
  left: "left",
  right: "right",
  top: "top",
};

const ICON_SIZE = 14;

const toBoxProps = (box: Box): DirectStyleProperty[] =>
  SIDES.map((side) => `${box}-${side}` as DirectStyleProperty);

const toSideTargets = (
  box: Box,
  prop: DirectStyleProperty,
  isLinked: boolean
): DirectStyleProperty[] => {
  if (isLinked) {
    return toBoxProps(box);
  }

  return [prop];
};

const toBoxName = (box: Box): string => {
  if (box === "padding") {
    return "Padding";
  }

  return "Margin";
};

const toLinkTip = (box: Box, isLinked: boolean): string => {
  const name = toBoxName(box);

  if (isLinked) {
    return `${name}: all sides change together`;
  }

  return `${name}: set each side`;
};

const toLinkIcon = (isLinked: boolean): "link" | "unlink" => {
  if (isLinked) {
    return "link";
  }

  return "unlink";
};

const toAutoShown = (
  declared: DeclaredMargins,
  side: Side,
  edit: DirectEdit,
  prop: DirectStyleProperty
): string | null => {
  if (declared[side]?.trim() === "auto" && !edit.dirty.includes(prop)) {
    return "auto";
  }

  return null;
};

const toSideDisplay = (
  box: Box,
  declared: DeclaredMargins,
  side: Side,
  edit: DirectEdit
): string | null => {
  if (box === "margin") {
    return toAutoShown(declared, side, edit, `${box}-${side}`);
  }

  return null;
};

const toAutoTip = (display: string | null, current: string): string | null => {
  if (display) {
    return `auto (${current} now)`;
  }

  return null;
};

const toDisplayPart = (display: string | null): Partial<NumberSpec> => {
  if (display === null) {
    return {};
  }

  return { display };
};

const toMinPart = (box: Box): Partial<NumberSpec> => {
  if (box === "padding") {
    return { min: 0 };
  }

  return {};
};

const toSideSpec = (options: SideSpecOptions): NumberSpec => ({
  edit: options.edit,
  label: options.label,
  prop: options.prop,
  targets: options.targets,
  ...toDisplayPart(options.display),
  ...toMinPart(options.box),
});

export {
  ICON_SIZE,
  NO_MARGINS,
  SIDE_LABEL,
  toAutoTip,
  toBoxName,
  toLinkIcon,
  toLinkTip,
  toSideDisplay,
  toSideSpec,
  toSideTargets,
};

export type { Box, DeclaredMargins };
