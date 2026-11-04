type StringFormat =
  | "date"
  | "datetime"
  | "email"
  | "id"
  | "plain"
  | "url"
  | "uuid";

interface StructureField {
  readonly key: string;
  readonly structure: Structure;
}

type Structure =
  | {
      readonly element: Structure | null;
      readonly kind: "array";
      readonly length: number;
    }
  | { readonly fields: readonly StructureField[]; readonly kind: "object" }
  | { readonly format: StringFormat; readonly kind: "string" }
  | { readonly kind: "boolean" }
  | { readonly kind: "integer" }
  | { readonly kind: "null" }
  | { readonly kind: "number" }
  | { readonly kind: "record"; readonly value: Structure | null };

const MAX_FIELDS = 40;

const toMergedStructure = (left: Structure, right: Structure): Structure => {
  if (left.kind === "null") {
    return right;
  }

  if (left.kind === "object" && right.kind === "object") {
    const merged = left.fields.map((field) => {
      const other =
        right.fields.find((candidate) => candidate.key === field.key) ?? null;

      if (other === null) {
        return field;
      }

      return {
        key: field.key,
        structure: toMergedStructure(field.structure, other.structure),
      };
    });

    const extra = right.fields.filter(
      (field) => !left.fields.some((candidate) => candidate.key === field.key)
    );

    return {
      fields: [...merged, ...extra].slice(0, MAX_FIELDS),
      kind: "object",
    };
  }

  if (left.kind === "array" && right.kind === "array") {
    let element = left.element ?? right.element;

    if (left.element !== null && right.element !== null) {
      element = toMergedStructure(left.element, right.element);
    }

    return {
      element,
      kind: "array",
      length: Math.max(left.length, right.length),
    };
  }

  if (left.kind === "record" && right.kind === "record") {
    let value = left.value ?? right.value;

    if (left.value !== null && right.value !== null) {
      value = toMergedStructure(left.value, right.value);
    }

    return { kind: "record", value };
  }

  if (left.kind === "integer" && right.kind === "number") {
    return right;
  }

  return left;
};

const toMergedElement = (
  left: Structure | null,
  right: Structure | null
): Structure | null => {
  if (left === null) {
    return right;
  }

  if (right === null) {
    return left;
  }

  return toMergedStructure(left, right);
};

const toMergedList = (list: readonly Structure[]): Structure | null => {
  let merged: Structure | null = null;

  for (const structure of list) {
    merged = toMergedElement(merged, structure);
  }

  return merged;
};

export { MAX_FIELDS, toMergedElement, toMergedList, toMergedStructure };

export type { StringFormat, Structure, StructureField };
