import type {
  BabelNode,
  ObjectExpression,
  ObjectProperty,
} from "./babel-types.js";
import {
  defaultOf,
  groupOf,
  keyOf,
  optionOf,
  propertyOf,
  textOf,
} from "./cva-node.js";
import type { CvaParts } from "./cva-node.js";
import { classify, parseClass } from "./deps.js";
import type { ComponentVariantCreate, ComponentVariantUpdate } from "./deps.js";
import { ComponentVariantError } from "./errors.js";
import {
  block,
  commaOf,
  insertEntries,
  keyText,
  lineIndent,
  literal,
} from "./splice.js";
import type { CodeStyle, Splice } from "./splice.js";

interface EditContext {
  readonly code: string;
  readonly name: string;
  readonly parts: CvaParts;
  readonly style: CodeStyle;
}

const refuse = (message: string): never => {
  throw new ComponentVariantError(message);
};

const slotOf = (raw: string): string => {
  const parsed = parseClass(raw);
  const kind = classify(parsed, null);

  if (!kind) {
    return `raw|${raw}`;
  }

  if (kind.kind === "sided") {
    return `${parsed.variants}|${kind.group}|${kind.sides.join("")}`;
  }

  return `${parsed.variants}|${kind.group}`;
};

const mergeClasses = (base: string, given: string): string => {
  const added = given.split(/\s+/u).filter(Boolean);
  const taken = new Set(added.map((raw) => slotOf(raw)));

  const kept = base
    .split(/\s+/u)
    .filter(Boolean)
    .filter((raw) => !taken.has(slotOf(raw)));

  return [...kept, ...added].join(" ");
};

const keysOf = (parts: CvaParts): string => {
  const names = (parts.variants?.properties ?? []).flatMap((property) => {
    if (property.type !== "ObjectProperty") {
      return [];
    }

    return [keyOf(property.key) ?? ""];
  });

  return names.join(", ") || "none";
};

const optionIn = (
  context: EditContext,
  key: string,
  value: string
): ObjectProperty => {
  const group = groupOf(context.parts, key);

  if (!group) {
    return refuse(
      `${context.name} has no variant key "${key}". Keys: ${keysOf(context.parts)}.`
    );
  }

  return (
    optionOf(group, value) ??
    refuse(`Variant key "${key}" of ${context.name} has no value "${value}".`)
  );
};

const copiedClasses = (
  context: EditContext,
  change: ComponentVariantCreate,
  from: string
): string => {
  const base = textOf(optionIn(context, change.key, from).value);

  if (base === null) {
    return refuse(`The classes of "${from}" are not a plain string.`);
  }

  return mergeClasses(base, change.classes ?? "");
};

const createClasses = (
  context: EditContext,
  change: ComponentVariantCreate
): string => {
  if (change.copyFrom) {
    return copiedClasses(context, change, change.copyFrom);
  }

  if (!change.classes) {
    return refuse("Pass classes, or copyFrom with an existing value.");
  }

  return change.classes;
};

const LINE_MAX = 80;

const valueEntry = (
  style: CodeStyle,
  indent: string,
  value: string,
  classes: string
): string => {
  const key = keyText(style, value);
  const text = literal(style, classes);

  if (`${indent}${key}: ${text},`.length <= LINE_MAX) {
    return `${key}: ${text}`;
  }

  return `${key}:\n${indent}${style.unit}${text}`;
};

const defaultEntry = (
  context: EditContext,
  key: string,
  value: string
): string => `${keyText(context.style, key)}: ${literal(context.style, value)}`;

const defaultSplices = (
  context: EditContext,
  key: string,
  value: string
): Splice[] => {
  const { code, parts, style } = context;
  const entry = defaultEntry(context, key, value);
  const found = propertyOf(parts.defaults, key);

  if (found) {
    return [
      {
        end: found.value.end ?? 0,
        start: found.value.start ?? 0,
        text: literal(style, value),
      },
    ];
  }

  if (parts.defaults) {
    return [insertEntries(code, style, parts.defaults, () => [entry])];
  }

  if (!parts.config) {
    return refuse(`${context.name} has no cva config object.`);
  }

  return [
    insertEntries(code, style, parts.config, (indent) => [
      block(style, indent, "defaultVariants", [entry]),
    ]),
  ];
};

const configSplice = (
  context: EditContext,
  config: ObjectExpression,
  key: string,
  value: { readonly entry: string; readonly name: string }
): Splice[] => {
  const { code, parts, style } = context;
  const fallback = defaultEntry(context, key, value.name);

  const splice = insertEntries(code, style, config, (indent) => {
    const variants = block(style, indent, "variants", [
      block(style, `${indent}${style.unit}`, key, [value.entry]),
    ]);

    if (parts.defaults) {
      return [variants];
    }

    return [variants, block(style, indent, "defaultVariants", [fallback])];
  });

  if (!parts.defaults) {
    return [splice];
  }

  return [splice, ...defaultSplices(context, key, value.name)];
};

const bareSplice = (
  context: EditContext,
  key: string,
  value: { readonly entry: string; readonly name: string }
): Splice[] => {
  const { code, parts, style } = context;

  if (!parts.base) {
    return refuse(`${context.name} calls cva() with no arguments.`);
  }

  const indent = lineIndent(code, parts.call.start ?? 0);
  const inner = `${indent}${style.unit}`;

  const variants = block(style, inner, "variants", [
    block(style, `${inner}${style.unit}`, key, [value.entry]),
  ]);

  const defaults = block(style, inner, "defaultVariants", [
    defaultEntry(context, key, value.name),
  ]);

  const at = parts.base.end ?? 0;
  const comma = commaOf(style);

  return [
    {
      end: at,
      start: at,
      text: `, {\n${inner}${variants},\n${inner}${defaults}${comma}\n${indent}}`,
    },
  ];
};

const newKeySplices = (
  context: EditContext,
  change: ComponentVariantCreate,
  classes: string
): Splice[] => {
  const { code, parts, style } = context;

  const value = {
    entry: `${keyText(style, change.value)}: ${literal(style, classes)}`,
    name: change.value,
  };

  if (parts.variants) {
    return [
      insertEntries(code, style, parts.variants, (indent) => [
        block(style, indent, change.key, [value.entry]),
      ]),
      ...defaultSplices(context, change.key, change.value),
    ];
  }

  if (parts.config) {
    return configSplice(context, parts.config, change.key, value);
  }

  return bareSplice(context, change.key, value);
};

const newKeyGuard = (
  context: EditContext,
  change: ComponentVariantCreate
): void => {
  if (!change.newKey) {
    refuse(
      `${context.name} has no variant key "${change.key}". Keys: ${keysOf(context.parts)}. Pass newKey: true to add it.`
    );
  }

  if (change.copyFrom) {
    refuse("copyFrom needs an existing variant key.");
  }
};

const createSplices = (
  context: EditContext,
  change: ComponentVariantCreate
): Splice[] => {
  const { code, parts, style } = context;
  const group = groupOf(parts, change.key);

  if (!group) {
    newKeyGuard(context, change);

    return newKeySplices(context, change, createClasses(context, change));
  }

  if (optionOf(group, change.value)) {
    return refuse(
      `Variant key "${change.key}" already has the value "${change.value}". Use update_component_variant.`
    );
  }

  const classes = createClasses(context, change);

  const splices = [
    insertEntries(code, style, group, (indent) => [
      valueEntry(style, indent, change.value, classes),
    ]),
  ];

  if (!change.setDefault) {
    return splices;
  }

  return [...splices, ...defaultSplices(context, change.key, change.value)];
};

const stringIs = (node: BabelNode | null | undefined, value: string): boolean =>
  node?.type === "StringLiteral" && node.value === value;

const compoundRef = (
  context: EditContext,
  element: BabelNode | null,
  rename: { readonly from: string; readonly key: string; readonly to: string }
): Splice[] => {
  if (element?.type !== "ObjectExpression") {
    return [];
  }

  const found = propertyOf(element, rename.key)?.value;
  const to = literal(context.style, rename.to);

  if (found && stringIs(found, rename.from)) {
    return [{ end: found.end ?? 0, start: found.start ?? 0, text: to }];
  }

  if (found?.type !== "ArrayExpression") {
    return [];
  }

  return found.elements.flatMap((item) => {
    if (!item || !stringIs(item, rename.from)) {
      return [];
    }

    return [{ end: item.end ?? 0, start: item.start ?? 0, text: to }];
  });
};

const renameRefs = (
  context: EditContext,
  rename: { readonly from: string; readonly key: string; readonly to: string },
  isDefaultSet: boolean
): Splice[] => {
  const compound = (context.parts.compound?.elements ?? []).flatMap((item) =>
    compoundRef(context, item, rename)
  );

  if (isDefaultSet || defaultOf(context.parts, rename.key) !== rename.from) {
    return compound;
  }

  return [...compound, ...defaultSplices(context, rename.key, rename.to)];
};

const classSplices = (
  context: EditContext,
  option: ObjectProperty,
  classes: string | null
): Splice[] => {
  if (classes === null) {
    return [];
  }

  if (textOf(option.value) === null) {
    return refuse("The classes of this value are not a plain string.");
  }

  return [
    {
      end: option.value.end ?? 0,
      start: option.value.start ?? 0,
      text: literal(context.style, classes),
    },
  ];
};

const renameSplices = (
  context: EditContext,
  option: ObjectProperty,
  change: ComponentVariantUpdate
): Splice[] => {
  const to = change.rename;

  if (!to || to === change.value) {
    return [];
  }

  const group = groupOf(context.parts, change.key);

  if (group && optionOf(group, to)) {
    return refuse(`Variant key "${change.key}" already has the value "${to}".`);
  }

  return [
    {
      end: option.key.end ?? 0,
      start: option.key.start ?? 0,
      text: keyText(context.style, to),
    },
    ...renameRefs(
      context,
      { from: change.value, key: change.key, to },
      change.setDefault
    ),
  ];
};

const updateSplices = (
  context: EditContext,
  change: ComponentVariantUpdate
): Splice[] => {
  if (!change.rename && change.classes === null && !change.setDefault) {
    return refuse("Pass rename, classes or setDefault.");
  }

  const option = optionIn(context, change.key, change.value);
  const name = change.rename ?? change.value;

  const splices = [
    ...classSplices(context, option, change.classes),
    ...renameSplices(context, option, change),
  ];

  if (!change.setDefault) {
    return splices;
  }

  return [...splices, ...defaultSplices(context, change.key, name)];
};

export { createSplices, updateSplices };

export type { EditContext };
