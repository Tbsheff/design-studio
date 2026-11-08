import { copy } from "./copy.js";
import type { CommentPrefill } from "./deps.js";

interface MarkupResultLayer {
  readonly component: string | null;
  readonly id: string;
  readonly label: string;
  readonly tag: string;
  readonly text: string;
}

interface MarkupResult {
  readonly attachment: { readonly id: string; readonly name: string };
  readonly layers: readonly MarkupResultLayer[];
}

const TEXT_MAX = 24;

const toLayerName = (layer: MarkupResultLayer): string => {
  const name = layer.component ?? layer.tag;

  if (layer.text === "") {
    return name;
  }

  return `${name} "${layer.text.slice(0, TEXT_MAX)}"`;
};

const toLayerLine = (layer: MarkupResultLayer): string => {
  const head = `${copy.layerChip} ${toLayerName(layer)}`;

  if (layer.label === "") {
    return head;
  }

  return `${head}: ${layer.label}`;
};

const toMarkupPrefill = (
  result: MarkupResult,
  dataUrl: string
): CommentPrefill => ({
  attachments: [
    { dataUrl, id: result.attachment.id, name: result.attachment.name },
  ],
  commentIds: [],
  text: [copy.prefillIntro, ...result.layers.map(toLayerLine)].join("\n"),
});

export { toLayerLine, toMarkupPrefill };

export type { MarkupResult, MarkupResultLayer };
