import type {
  EngineResult,
  PrismaField,
  PrismaKind,
  PrismaModel,
  SchemaSource,
} from "./types.js";

interface RawLine {
  readonly number: number;
  readonly text: string;
}

interface OpenBlock {
  readonly kind: PrismaKind;
  readonly line: number;
  readonly lines: readonly RawLine[];
  readonly name: string;
}

interface RawBlock {
  readonly file: string;
  readonly kind: PrismaKind;
  readonly line: number;
  readonly lines: readonly RawLine[];
  readonly name: string;
}

interface BlockStart {
  readonly kind: PrismaKind;
  readonly name: string;
}

const BLOCK_WORDS = new Set(["enum", "model", "type", "view"]);

const WORD_ONLY = /^\w+$/u;

const RELATION_FIELDS = /fields:\s*\[(?<names>[^\]]*)\]/u;

const toBlockStart = (text: string): BlockStart | null => {
  if (!text.endsWith("{")) {
    return null;
  }

  const tokens = text
    .slice(0, -1)
    .split(/\s+/u)
    .filter((token) => token !== "");

  const [word = "", name = ""] = tokens;

  if (!BLOCK_WORDS.has(word) || tokens.length !== 2 || !WORD_ONLY.test(name)) {
    return null;
  }

  if (word === "enum") {
    return { kind: "enum", name };
  }

  return { kind: "model", name };
};

const toCodeText = (raw: string): string => {
  let isQuoted = false;

  for (const [index, char] of [...raw].entries()) {
    if (char === '"') {
      isQuoted = !isQuoted;
    }

    if (!isQuoted && char === "/" && raw.charAt(index + 1) === "/") {
      return raw.slice(0, index).trim();
    }
  }

  return raw.trim();
};

const toBalanced = (text: string, start: number): string | null => {
  let depth = 0;

  for (let index = start; index < text.length; index += 1) {
    const char = text.charAt(index);

    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start + 1, index);
      }
    }
  }

  return null;
};

const toAttributeArgs = (attributes: string, name: string): string | null => {
  const marker = `@${name}`;
  const at = attributes.indexOf(marker);

  if (at === -1) {
    return null;
  }

  const open = at + marker.length;
  const next = attributes.charAt(open);

  if (next === "(") {
    return toBalanced(attributes, open);
  }

  if (next === "" || next === " ") {
    return "";
  }

  return null;
};

const toRelationFields = (args: string): readonly string[] => {
  const names = RELATION_FIELDS.exec(args)?.groups?.["names"] ?? "";

  return names
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
};

const toTypeEnd = (text: string): number => {
  let depth = 0;

  for (const [index, char] of [...text].entries()) {
    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;
    }

    if (depth === 0 && char === " ") {
      return index;
    }
  }

  return text.length;
};

const toTypeName = (token: string): string => {
  const open = token.indexOf("(");

  if (open === -1) {
    return token;
  }

  return token.slice(0, open);
};

const toDefaultText = (attributes: string): string | null => {
  const args = toAttributeArgs(attributes, "default");

  if (args === null || args === "") {
    return null;
  }

  return args.trim();
};

const toScalarField = (line: RawLine): PrismaField | null => {
  const nameEnd = line.text.indexOf(" ");

  if (nameEnd < 1) {
    return null;
  }

  const name = line.text.slice(0, nameEnd);
  const rest = line.text.slice(nameEnd).trim();
  const typeEnd = toTypeEnd(rest);
  const attributes = rest.slice(typeEnd).trim();
  const token = rest.slice(0, typeEnd);
  const isOptional = token.endsWith("?");
  const bare = token.replace(/\?$/u, "");
  const isList = bare.endsWith("[]");
  const type = toTypeName(bare.replace(/\[\]$/u, ""));

  if (!WORD_ONLY.test(name) || !WORD_ONLY.test(type)) {
    return null;
  }

  const isId = toAttributeArgs(attributes, "id") !== null;
  const isUnique = toAttributeArgs(attributes, "unique") !== null;
  const relationArgs = toAttributeArgs(attributes, "relation") ?? "";
  const fields = toRelationFields(relationArgs);
  const defaultText = toDefaultText(attributes);
  const enumValues: string[] = [];
  const relation = { fields, model: type };

  return {
    defaultText,
    enumValues,
    isId,
    isList,
    isOptional,
    isUnique,
    name,
    relation,
    type,
  };
};

const toEnumValues = (block: RawBlock): string[] =>
  block.lines.flatMap((line) => {
    const word = line.text.split(/\s+/u)[0] ?? "";

    if (!WORD_ONLY.test(word)) {
      return [];
    }

    return [word];
  });

const toLineKeep = (
  open: OpenBlock | null,
  line: RawLine
): OpenBlock | null => {
  if (open === null || line.text === "") {
    return open;
  }

  return { ...open, lines: [...open.lines, line] };
};

const toBlocks = (source: SchemaSource): RawBlock[] => {
  const blocks: RawBlock[] = [];
  let open: OpenBlock | null = null;

  for (const [index, raw] of source.text.split(/\r?\n/u).entries()) {
    const text = toCodeText(raw.replaceAll("\t", " "));
    const line: RawLine = { number: index + 1, text };
    const start = toBlockStart(text);

    if (open === null && start !== null) {
      open = {
        kind: start.kind,
        line: line.number,
        lines: [],
        name: start.name,
      };
    } else if (open !== null && text === "}") {
      blocks.push({
        file: source.file,
        kind: open.kind,
        line: open.line,
        lines: open.lines,
        name: open.name,
      });
      open = null;
    } else {
      open = toLineKeep(open, line);
    }
  }

  return blocks;
};

const toFields = (
  block: RawBlock,
  enums: ReadonlyMap<string, readonly string[]>,
  modelNames: ReadonlySet<string>
): PrismaField[] =>
  block.lines.flatMap((line) => {
    const field = toScalarField(line);

    if (field === null || line.text.startsWith("@@")) {
      return [];
    }

    const enumValues = enums.get(field.type) ?? [];

    if (modelNames.has(field.type)) {
      return [{ ...field, enumValues }];
    }

    return [{ ...field, enumValues, relation: null }];
  });

const toPrismaModels = (
  sources: readonly SchemaSource[]
): EngineResult<PrismaModel[]> => {
  const blocks = sources.flatMap((source) => toBlocks(source));

  if (blocks.length === 0) {
    return { code: "empty-schema", ok: false };
  }

  const enums = new Map<string, readonly string[]>();
  const modelNames = new Set<string>();

  for (const block of blocks) {
    if (block.kind === "enum") {
      enums.set(block.name, toEnumValues(block));
    } else {
      modelNames.add(block.name);
    }
  }

  const value = blocks.map((block): PrismaModel => ({
    fields: toFields(block, enums, modelNames),
    file: block.file,
    kind: block.kind,
    line: block.line,
    name: block.name,
    values: enums.get(block.name) ?? [],
  }));

  return { ok: true, value };
};

export { toPrismaModels };
