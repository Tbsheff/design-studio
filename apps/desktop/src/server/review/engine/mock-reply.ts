import type { PromptLayer } from "./critique-prompt.js";

const HEADINGS: ReadonlySet<string> = new Set(["h1", "h2", "h3"]);

const ACTIONS: ReadonlySet<string> = new Set(["a", "button"]);

const TEXT_CHARS = 40;

const toLabel = (layer: PromptLayer | null): string => {
  if (layer === null) {
    return "the page";
  }

  return `"${layer.text.trim().slice(0, TEXT_CHARS)}"`;
};

const toMockReply = (layers: readonly PromptLayer[]): string => {
  const heading = layers.find(
    (layer) => HEADINGS.has(layer.tag) && layer.text.trim() !== ""
  );

  const action = layers.find(
    (layer) => ACTIONS.has(layer.tag) && layer.text.trim() !== ""
  );

  const issues = [
    {
      fix: "Make the heading larger and give it more space above and below.",
      layerId: heading?.ref ?? null,
      message: `The heading ${toLabel(heading ?? null)} does not stand out from the text near it.`,
      severity: "high",
    },
    {
      fix: "Use one filled style for the main action and a quiet style for the rest.",
      layerId: action?.ref ?? null,
      message: `The action ${toLabel(action ?? null)} has the same weight as the links around it.`,
      severity: "medium",
    },
    {
      fix: "Replace the generic words with the product name and one concrete benefit.",
      layerId: null,
      message: "The copy is generic and does not say what the product does.",
      severity: "low",
    },
  ];

  return JSON.stringify({
    issues,
    scores: { color: 7, copy: 5, hierarchy: 6, spacing: 7, type: 8 },
  });
};

export { toMockReply };
