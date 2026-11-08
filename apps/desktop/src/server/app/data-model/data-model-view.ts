import { toSampleRows, toTsText } from "./engine/index.js";
import type {
  PrismaField,
  PrismaModel,
  SampleRow,
  SampleVariant,
} from "./engine/index.js";

interface ListDataModelCommand {
  readonly appRoot: string;
  readonly cursor: string | null;
  readonly limit: number;
  readonly query: string | null;
}

interface GetDataModelCommand {
  readonly appRoot: string;
  readonly limit: number;
  readonly model: string;
  readonly rows: number;
  readonly seed: number;
  readonly variant: SampleVariant;
}

interface DataModelSummary {
  readonly fieldCount: number;
  readonly file: string;
  readonly kind: "enum" | "model";
  readonly line: number;
  readonly name: string;
  readonly relationNames: readonly string[];
}

interface DataModelPage {
  readonly items: readonly DataModelSummary[];
  readonly next: string | null;
}

interface DataModelDetail {
  readonly fields: readonly PrismaField[];
  readonly file: string;
  readonly line: number;
  readonly name: string;
  readonly rows: readonly SampleRow[];
  readonly tsText: string;
}

const NAME_LIMIT = 12;

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

const toFieldCount = (model: PrismaModel): number => {
  if (model.kind === "enum") {
    return model.values.length;
  }

  return model.fields.length;
};

const toSummary = (model: PrismaModel): DataModelSummary => {
  const relationNames = model.fields.flatMap((field) => {
    if (field.relation === null) {
      return [];
    }

    return [field.relation.model];
  });

  return {
    fieldCount: toFieldCount(model),
    file: model.file,
    kind: model.kind,
    line: model.line,
    name: model.name,
    relationNames: [...new Set(relationNames)],
  };
};

const toRank = (model: PrismaModel, query: string): number => {
  const name = model.name.toLowerCase();

  if (name === query) {
    return 0;
  }

  if (name.startsWith(query)) {
    return 1;
  }

  return 2;
};

const toDataModelPage = (
  models: readonly PrismaModel[],
  command: ListDataModelCommand
): DataModelPage => {
  const query = (command.query ?? "").trim().toLowerCase();

  const matched = models
    .filter((model) => model.name.toLowerCase().includes(query))
    .toSorted((left, right) => toRank(left, query) - toRank(right, query));

  const start = toStart(command.cursor);
  const slice = matched.slice(start, start + command.limit);
  const items = slice.map((model) => toSummary(model));
  const end = start + items.length;

  if (end < matched.length) {
    return { items, next: String(end) };
  }

  return { items, next: null };
};

const toFoundModel = (
  models: readonly PrismaModel[],
  name: string
): PrismaModel | null => {
  const wanted = name.toLowerCase();

  return (
    models.find((model) => model.name === name) ??
    models.find((model) => model.name.toLowerCase() === wanted) ??
    null
  );
};

const toModelNames = (models: readonly PrismaModel[]): string => {
  const names = models.flatMap((model) => {
    if (model.kind === "model") {
      return [model.name];
    }

    return [];
  });

  return names.slice(0, NAME_LIMIT).join(", ");
};

const toEnumFields = (model: PrismaModel): PrismaField[] =>
  model.values.map((value) => ({
    defaultText: null,
    enumValues: [],
    isId: false,
    isList: false,
    isOptional: false,
    isUnique: false,
    name: value,
    relation: null,
    type: model.name,
  }));

const toSampled = (
  models: readonly PrismaModel[],
  name: string,
  command: GetDataModelCommand
): SampleRow[] | null => {
  const { rows, seed, variant } = command;
  const sampled = toSampleRows({ models, name, rows, seed, variant });

  if (!sampled.ok) {
    return null;
  }

  return sampled.value;
};

const toDataModelDetail = (
  models: readonly PrismaModel[],
  found: PrismaModel,
  command: GetDataModelCommand
): DataModelDetail | null => {
  const { file, line, name } = found;

  if (found.kind === "enum") {
    const fields = toEnumFields(found);
    const rows: SampleRow[] = [];

    const tsText = toTsText(found, rows);

    return { fields, file, line, name, rows, tsText };
  }

  const rows = toSampled(models, name, command);

  if (rows === null) {
    return null;
  }

  const fields = found.fields.slice(0, command.limit);
  const tsText = toTsText(found, rows);

  return { fields, file, line, name, rows, tsText };
};

export { toDataModelDetail, toDataModelPage, toFoundModel, toModelNames };

export type {
  DataModelDetail,
  DataModelPage,
  DataModelSummary,
  GetDataModelCommand,
  ListDataModelCommand,
};
