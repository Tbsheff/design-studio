import type {
  BoxSide,
  DirectStyleProperty,
  SpacingProperty,
  SpacingSide,
} from "./deps.js";
import { SpacingError } from "./errors.js";

const BOX_OF = new Map<SpacingSide, readonly BoxSide[]>([
  ["all", ["top", "right", "bottom", "left"]],
  ["bottom", ["bottom"]],
  ["left", ["left"]],
  ["right", ["right"]],
  ["top", ["top"]],
  ["x", ["left", "right"]],
  ["y", ["top", "bottom"]],
]);

const GAP_OF = new Map<SpacingSide, DirectStyleProperty>([
  ["all", "gap"],
  ["x", "column-gap"],
  ["y", "row-gap"],
]);

const toBoxProps = (
  property: "margin" | "padding",
  side: SpacingSide
): DirectStyleProperty[] =>
  (BOX_OF.get(side) ?? []).map(
    (box) => `${property}-${box}` as DirectStyleProperty
  );

const toGapProps = (side: SpacingSide): DirectStyleProperty[] => {
  const prop = GAP_OF.get(side);

  if (!prop) {
    throw new SpacingError(
      "gap takes side all, x (column gap) or y (row gap)."
    );
  }

  return [prop];
};

const toAxisProps = (
  property: "column-gap" | "row-gap",
  side: SpacingSide
): DirectStyleProperty[] => {
  if (side !== "all") {
    throw new SpacingError(`${property} takes side all.`);
  }

  return [property];
};

const toStylePropsOf = (
  property: SpacingProperty,
  side: SpacingSide
): DirectStyleProperty[] => {
  if (property === "padding" || property === "margin") {
    return toBoxProps(property, side);
  }

  if (property === "gap") {
    return toGapProps(side);
  }

  return toAxisProps(property, side);
};

export { toStylePropsOf as stylePropsOf };
