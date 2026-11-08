import type { BlockSchema } from "@design-studio/actions/block/schema";

import { inspectBlockKit } from "./block-kit.js";
import type { BlockKit } from "./block-kit.js";
import type { Project } from "./deps.js";
import { listBlockTemplates, toBlockComponents } from "./engine/index.js";
import type { BlockKind, BlockTemplate } from "./engine/index.js";

type Block = typeof BlockSchema.Type;

interface ListBlockCommand {
  readonly cursor: string | null;
  readonly kind: BlockKind | null;
  readonly limit: number;
  readonly projectId: string;
  readonly query: string | null;
}

interface BlockPage {
  readonly items: readonly Block[];
  readonly next: string | null;
}

const toOffset = (cursor: string | null): number => {
  const offset = Number(cursor ?? "0");

  if (Number.isInteger(offset) && offset >= 0) {
    return offset;
  }

  return 0;
};

const isMatch = (
  template: BlockTemplate,
  command: ListBlockCommand
): boolean => {
  if (command.kind !== null && template.kind !== command.kind) {
    return false;
  }

  if (command.query === null) {
    return true;
  }

  const wanted = command.query.toLowerCase();

  return `${template.name} ${template.description} ${template.kind}`
    .toLowerCase()
    .includes(wanted);
};

const toBlock = (template: BlockTemplate, kit: BlockKit): Block => {
  const components = toBlockComponents(template);
  const missing = components.filter((name) => !kit.available.has(name));

  const { description, id, kind, name } = template;
  const isKitMatched = missing.length === 0;
  const previewPath = null;

  return {
    components,
    description,
    id,
    isKitMatched,
    kind,
    missing,
    name,
    previewPath,
  };
};

const runBlockList = async (
  project: Project,
  workTree: string,
  command: ListBlockCommand
): Promise<BlockPage> => {
  const matched = listBlockTemplates().filter((template) =>
    isMatch(template, command)
  );

  const names = [
    ...new Set(matched.flatMap((template) => toBlockComponents(template))),
  ];

  const kit = await inspectBlockKit(project, workTree, names);
  const start = toOffset(command.cursor);
  const end = start + command.limit;

  const items = matched
    .slice(start, end)
    .map((template) => toBlock(template, kit));

  let next: string | null = null;

  if (end < matched.length) {
    next = String(end);
  }

  return { items, next };
};

export { runBlockList };

export type { Block, BlockPage, ListBlockCommand };
