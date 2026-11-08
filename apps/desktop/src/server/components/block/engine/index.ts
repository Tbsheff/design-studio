import { FORM_TEMPLATES } from "./form-templates.js";
import { HEADER_TEMPLATES } from "./header-templates.js";
import { STATE_TEMPLATES } from "./state-templates.js";
import { STATS_TEMPLATES } from "./stats-templates.js";
import { TABLE_TEMPLATES } from "./table-templates.js";
import type { BlockTemplate } from "./types.js";

const BLOCK_TEMPLATES: readonly BlockTemplate[] = [
  ...STATS_TEMPLATES,
  ...TABLE_TEMPLATES,
  ...HEADER_TEMPLATES,
  ...FORM_TEMPLATES,
  ...STATE_TEMPLATES,
];

const listBlockTemplates = (): readonly BlockTemplate[] => BLOCK_TEMPLATES;

const getBlockTemplate = (id: string): BlockTemplate | null =>
  BLOCK_TEMPLATES.find((template) => template.id === id) ?? null;

export { getBlockTemplate, listBlockTemplates };

export { toBlockComponents, toBlockMarkup } from "./render.js";

export type {
  BlockKind,
  BlockRender,
  BlockRenderOptions,
  BlockTemplate,
} from "./types.js";
