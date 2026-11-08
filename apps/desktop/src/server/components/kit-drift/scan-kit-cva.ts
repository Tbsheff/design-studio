import type { KitVariantGroup, KitVariantOption } from "./engine/index.js";
import type {
  Ts,
  TsCallExpression,
  TsExpression,
  TsNode,
  TsPropertyName,
} from "./ts-type.js";

interface KitCva {
  readonly base: string;
  readonly groups: readonly KitVariantGroup[];
}

interface Field {
  readonly name: string;
  readonly value: TsExpression;
}

const toFieldName = (ts: Ts, name: TsPropertyName): string | null => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }

  return null;
};

const toText = (ts: Ts, node: TsNode | null): string | null => {
  if (node === null) {
    return null;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return null;
};

const listFields = (ts: Ts, node: TsNode | null): Field[] => {
  if (node === null || !ts.isObjectLiteralExpression(node)) {
    return [];
  }

  return node.properties.flatMap((property): Field[] => {
    if (!ts.isPropertyAssignment(property)) {
      return [];
    }

    const name = toFieldName(ts, property.name);

    if (name === null) {
      return [];
    }

    return [{ name, value: property.initializer }];
  });
};

const toOptions = (ts: Ts, fields: readonly Field[]): KitVariantOption[] =>
  fields.flatMap((field): KitVariantOption[] => {
    const classes = toText(ts, field.value);

    if (classes === null) {
      return [];
    }

    return [{ classes, value: field.name }];
  });

const toGroups = (ts: Ts, config: readonly Field[]): KitVariantGroup[] => {
  const variants = config.find((field) => field.name === "variants");

  const defaults = listFields(
    ts,
    config.find((field) => field.name === "defaultVariants")?.value ?? null
  );

  return listFields(ts, variants?.value ?? null).map((group) => ({
    default: toText(
      ts,
      defaults.find((field) => field.name === group.name)?.value ?? null
    ),
    options: toOptions(ts, listFields(ts, group.value)),
    prop: group.name,
  }));
};

const isCvaCall = (ts: Ts, node: TsNode): node is TsCallExpression =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === "cva";

const toKitCva = (ts: Ts, call: TsCallExpression): KitCva | null => {
  const [baseNode, configNode] = call.arguments;

  const groups = toGroups(ts, listFields(ts, configNode ?? null));

  if (groups.length === 0) {
    return null;
  }

  return { base: toText(ts, baseNode ?? null) ?? "", groups };
};

const getKitCva = (ts: Ts, code: string, file: string): KitCva | null => {
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX
  );

  let found: KitCva | null = null;

  const visit = (node: TsNode): void => {
    if (found === null && isCvaCall(ts, node)) {
      found = toKitCva(ts, node);
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return found;
};

export { getKitCva };

export type { KitCva };
