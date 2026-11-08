import type { RouteOutput, dataModelRoutes } from "./deps.js";

type DataModelDetail = RouteOutput<typeof dataModelRoutes.getDataModel>;

type DataModelField = DataModelDetail["fields"][number];

type DataModelCell = DataModelDetail["rows"][number][string];

type DataModelVariant = "filled" | "long" | "sparse";

interface TableRowModel {
  readonly cells: readonly string[];
  readonly key: string;
}

interface TableModel {
  readonly columns: readonly string[];
  readonly rows: readonly TableRowModel[];
}

const VARIANTS: readonly DataModelVariant[] = ["filled", "long", "sparse"];

const LIST_LIMIT = 200;

const SAMPLE_ROWS = 3;

const FIELD_LIMIT = 500;

const PREVIEW_COLUMNS = 6;

const FLAG_NAMES = [
  ["isId", "id"],
  ["isUnique", "unique"],
  ["isOptional", "optional"],
  ["isList", "list"],
] as const;

const toPromptText = (name: string): string =>
  `Use sample rows of model ${name} (get_data_model)`;

const toCellText = (cell: DataModelCell): string => {
  if (cell === null) {
    return "null";
  }

  if (Array.isArray(cell)) {
    return cell.join(", ");
  }

  return String(cell);
};

const toFlagText = (field: DataModelField): string =>
  FLAG_NAMES.flatMap(([key, label]) => {
    if (field[key]) {
      return [label];
    }

    return [];
  }).join(" ");

const toDetailText = (field: DataModelField): string => {
  if (field.relation !== null) {
    return field.relation.model;
  }

  if (field.enumValues.length > 0) {
    return field.enumValues.join(" | ");
  }

  return field.defaultText ?? "";
};

const toFieldTable = (
  detail: DataModelDetail,
  columns: readonly string[]
): TableModel => ({
  columns,
  rows: detail.fields.map((field) => ({
    cells: [field.name, field.type, toFlagText(field), toDetailText(field)],
    key: field.name,
  })),
});

const toPreviewColumns = (detail: DataModelDetail): string[] =>
  detail.fields
    .flatMap((field) => {
      if (field.relation === null) {
        return [field.name];
      }

      return [];
    })
    .slice(0, PREVIEW_COLUMNS);

const toRowsTable = (detail: DataModelDetail): TableModel => {
  const columns = toPreviewColumns(detail);

  const rows = detail.rows.map((row) => {
    const cells = columns.map((column) => toCellText(row[column] ?? null));

    return { cells, key: cells.join("|") };
  });

  return { columns, rows };
};

export {
  FIELD_LIMIT,
  LIST_LIMIT,
  SAMPLE_ROWS,
  VARIANTS,
  toFieldTable,
  toPromptText,
  toRowsTable,
};

export type {
  DataModelCell,
  DataModelDetail,
  DataModelField,
  DataModelVariant,
  TableModel,
  TableRowModel,
};
