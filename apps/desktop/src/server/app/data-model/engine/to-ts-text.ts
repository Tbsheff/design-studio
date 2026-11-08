import type {
  PrismaField,
  PrismaModel,
  SampleCell,
  SampleRow,
} from "./types.js";

const INDENT = "  ";

const toLowerFirst = (name: string): string =>
  `${name.charAt(0).toLowerCase()}${name.slice(1)}`;

const toCellText = (cell: SampleCell, field: PrismaField): string => {
  if (field.type === "DateTime" && !field.isList && cell !== null) {
    return `new Date(${JSON.stringify(cell)})`;
  }

  return JSON.stringify(cell);
};

const toRowText = (model: PrismaModel, row: SampleRow): string => {
  const lines = model.fields
    .filter((field) => field.relation === null)
    .map((field) => {
      const cell = row[field.name] ?? null;

      return `${INDENT}${INDENT}${field.name}: ${toCellText(cell, field)},`;
    });

  return [`${INDENT}{`, ...lines, `${INDENT}},`].join("\n");
};

const toTsText = (model: PrismaModel, rows: readonly SampleRow[]): string => {
  if (model.kind === "enum") {
    const values = model.values.map((value) => JSON.stringify(value));

    return `const ${toLowerFirst(model.name)}Values = [${values.join(", ")}] as const;`;
  }

  const body = rows.map((row) => toRowText(model, row));

  return [
    `const ${toLowerFirst(model.name)}Rows: ${model.name}[] = [`,
    ...body,
    "];",
  ].join("\n");
};

export { toTsText };
