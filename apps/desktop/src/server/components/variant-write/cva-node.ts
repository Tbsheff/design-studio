import type {
  ArrayExpression,
  BabelNode,
  CallExpression,
  ObjectExpression,
  ObjectProperty,
} from "./babel-types.js";
import type { ComponentVariantValue } from "./deps.js";

interface CvaParts {
  readonly base: BabelNode | null;
  readonly call: CallExpression;
  readonly compound: ArrayExpression | null;
  readonly config: ObjectExpression | null;
  readonly defaults: ObjectExpression | null;
  readonly variants: ObjectExpression | null;
}

const keyOf = (key: BabelNode): string | null => {
  if (key.type === "Identifier") {
    return key.name;
  }

  if (key.type === "StringLiteral") {
    return key.value;
  }

  if (key.type === "NumericLiteral") {
    return String(key.value);
  }

  return null;
};

const isNamed = (
  property: BabelNode,
  name: string
): property is ObjectProperty =>
  property.type === "ObjectProperty" &&
  !property.computed &&
  keyOf(property.key) === name;

const propertyOf = (
  object: ObjectExpression | null,
  name: string
): ObjectProperty | null => {
  if (!object) {
    return null;
  }

  const found = object.properties.find((property) => isNamed(property, name));

  if (found?.type === "ObjectProperty") {
    return found;
  }

  return null;
};

const objectOf = (
  node: BabelNode | null | undefined
): ObjectExpression | null => {
  if (node?.type === "ObjectExpression") {
    return node;
  }

  return null;
};

const arrayOf = (
  node: BabelNode | null | undefined
): ArrayExpression | null => {
  if (node?.type === "ArrayExpression") {
    return node;
  }

  return null;
};

const textOf = (node: BabelNode): string | null => {
  if (node.type === "StringLiteral") {
    return node.value;
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? "";
  }

  return null;
};

const partsOf = (node: CallExpression): CvaParts => {
  const [base, second] = node.arguments;
  const object = objectOf(second);

  return {
    base: base ?? null,
    call: node,
    compound: arrayOf(propertyOf(object, "compoundVariants")?.value),
    config: object,
    defaults: objectOf(propertyOf(object, "defaultVariants")?.value),
    variants: objectOf(propertyOf(object, "variants")?.value),
  };
};

const groupOf = (parts: CvaParts, key: string): ObjectExpression | null =>
  objectOf(propertyOf(parts.variants, key)?.value);

const optionOf = (
  group: ObjectExpression,
  value: string
): ObjectProperty | null => propertyOf(group, value);

const optionValueOf = (property: BabelNode): ComponentVariantValue[] => {
  if (property.type !== "ObjectProperty" || property.computed) {
    return [];
  }

  const value = keyOf(property.key);
  const classes = textOf(property.value);

  if (value === null || classes === null) {
    return [];
  }

  return [{ classes, value }];
};

const valuesOf = (group: ObjectExpression): ComponentVariantValue[] =>
  group.properties.flatMap((property) => optionValueOf(property));

const defaultOf = (parts: CvaParts, key: string): string | null => {
  const node = propertyOf(parts.defaults, key)?.value;

  if (!node) {
    return null;
  }

  if (node.type === "BooleanLiteral" || node.type === "NumericLiteral") {
    return String(node.value);
  }

  return textOf(node);
};

const startOf = (node: BabelNode): number => node.start ?? 0;

const endOf = (node: BabelNode): number => node.end ?? 0;

export {
  defaultOf,
  endOf,
  groupOf,
  keyOf,
  optionOf,
  partsOf,
  propertyOf,
  startOf,
  textOf,
  valuesOf,
};

export type { CvaParts };
