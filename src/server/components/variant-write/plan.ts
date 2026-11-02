import { defaultOf, groupOf, optionOf, partsOf, valuesOf } from "./cva-node.js";
import {
  cvaCalls,
  parseModuleFile,
  RESERVED_KEYS,
  VARIANT_CLASSES,
  VARIANT_KEY,
  VARIANT_VALUE,
} from "./deps.js";
import type {
  ComponentVariantChange,
  ComponentVariantRequest,
  ComponentVariantValue,
  WrittenFile,
} from "./deps.js";
import { createSplices, updateSplices } from "./edits.js";
import type { EditContext } from "./edits.js";
import { ComponentVariantError } from "./errors.js";
import { locateCva } from "./locate.js";
import type { LocatedCva, VariantScope } from "./locate.js";
import { applySplices, styleOf } from "./splice.js";
import type { Splice } from "./splice.js";

interface VariantPlan {
  readonly component: { readonly file: string; readonly name: string | null };
  readonly cva: string;
  readonly default: string | null;
  readonly key: string;
  readonly note: string | null;
  readonly title: string;
  readonly value: string;
  readonly values: readonly ComponentVariantValue[];
  readonly written: WrittenFile[];
}

interface Reread {
  readonly default: string | null;
  readonly values: readonly ComponentVariantValue[];
}

const SAME = "The component already has this variant.";

const LOST = "The changed cva() lost the value. Nothing was written.";

const refuse = (message: string): never => {
  throw new ComponentVariantError(message);
};

const checkName = (
  pattern: RegExp,
  text: string | null,
  label: string
): void => {
  if (text !== null && !pattern.test(text)) {
    refuse(`${label} "${text}" is not a valid name.`);
  }
};

const validate = (change: ComponentVariantChange): void => {
  checkName(VARIANT_KEY, change.key, "Variant key");
  checkName(VARIANT_VALUE, change.value, "Value");
  checkName(VARIANT_CLASSES, change.classes, "Classes");

  if (RESERVED_KEYS.has(change.key)) {
    refuse(`"${change.key}" is not a variant key.`);
  }

  if (change.kind === "update") {
    checkName(VARIANT_VALUE, change.rename, "New value");
  }
};

const finalValue = (change: ComponentVariantChange): string => {
  if (change.kind === "update" && change.rename) {
    return change.rename;
  }

  return change.value;
};

const splicesOf = (
  context: EditContext,
  change: ComponentVariantChange
): Splice[] => {
  if (change.kind === "create") {
    return createSplices(context, change);
  }

  return updateSplices(context, change);
};

const reread = (
  located: LocatedCva,
  next: string,
  change: ComponentVariantChange
): Reread => {
  const ast =
    parseModuleFile(next, located.source.file) ??
    refuse("The changed file does not parse. Nothing was written.");

  const call = cvaCalls(ast).find(
    (entry) => entry.info.name === located.call.info.name
  );

  if (!call) {
    return refuse(LOST);
  }

  const parts = partsOf(call.node);
  const group = groupOf(parts, change.key);

  if (!group || !optionOf(group, finalValue(change))) {
    return refuse(LOST);
  }

  return { default: defaultOf(parts, change.key), values: valuesOf(group) };
};

const titleOf = (label: string, change: ComponentVariantChange): string => {
  if (change.kind === "create") {
    return `Variant: add ${label} ${change.key} ${change.value}`;
  }

  if (change.rename && change.rename !== change.value) {
    return `Variant: rename ${label} ${change.key} ${change.value} to ${change.rename}`;
  }

  return `Variant: change ${label} ${change.key} ${change.value}`;
};

const noteOf = (
  located: LocatedCva,
  change: ComponentVariantChange,
  hadKey: boolean
): string | null => {
  if (hadKey) {
    return null;
  }

  const { name } = located.call.info;

  return `${name} has the new key ${change.key}. Its default applies now; to use other values the component must pass ${change.key} to ${name}().`;
};

const planVariantWrite = async (
  scope: VariantScope,
  request: ComponentVariantRequest
): Promise<VariantPlan> => {
  const { change } = request;

  validate(change);

  const located = await locateCva(scope, request.target);
  const cvaParts = partsOf(located.call.node);
  const hadKey = groupOf(cvaParts, change.key) !== null;

  const context: EditContext = {
    code: located.code,
    name: located.call.info.name,
    parts: cvaParts,
    style: styleOf(located.code, located.call.node),
  };

  const next = applySplices(located.code, splicesOf(context, change));

  if (next === located.code) {
    return refuse(SAME);
  }

  const after = reread(located, next, change);
  const label = located.name ?? located.call.info.name;

  return {
    component: { file: located.source.relative, name: located.name },
    cva: located.call.info.name,
    default: after.default,
    key: change.key,
    note: noteOf(located, change, hadKey),
    title: titleOf(label, change),
    value: finalValue(change),
    values: after.values,
    written: [{ code: next, original: located.code, target: located.source }],
  };
};

export { planVariantWrite };

export type { VariantPlan };
