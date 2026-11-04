interface PromptLayer {
  readonly ref: string;
  readonly tag: string;
  readonly text: string;
}

interface PromptInput {
  readonly designMd: string | null;
  readonly frameLabel: string;
  readonly height: number;
  readonly layers: readonly PromptLayer[];
  readonly tasteRules: readonly string[];
  readonly width: number;
}

const CRITIQUE_SYSTEM = `You are a senior product design critic. You did not build this design and you owe its builder nothing. Judge it with fresh eyes from the screenshots.
- Score five areas from 0 to 10, where 10 is excellent and 0 is broken: hierarchy (one clear focus, a clear reading order), spacing (rhythm, alignment, density), type (scale, weight, line length, contrast of text), color (palette, contrast, meaning), copy (specific, short, no placeholder text, no contradictions).
- List at most 12 issues, worst first. Each issue names one problem and one concrete fix.
- Judge against <design-md> and <taste> when they are given. Quote a rule when an issue breaks it.
- Set "layerId" to the id of the layer that has the problem. Use only an id from <layers>. Use null when no layer fits.
- Do not praise. Do not repeat an issue.
- Answer with JSON only: {"scores":{"hierarchy":0,"spacing":0,"type":0,"color":0,"copy":0},"issues":[{"layerId":"e000000"|null,"severity":"high"|"medium"|"low","message":"the problem","fix":"one concrete change"}]}. Use high for issues that break the layout or accessibility, medium for clear quality problems and low for polish.`;

const DESIGN_MD_CHARS = 6000;

const LAYER_TEXT_CHARS = 60;

const toLayerLine = (layer: PromptLayer): string => {
  const text = layer.text.replaceAll(/\s+/gu, " ").trim();

  return `- ${layer.ref} <${layer.tag}> "${text.slice(0, LAYER_TEXT_CHARS)}"`;
};

const toList = (lines: readonly string[]): string => {
  if (lines.length === 0) {
    return "- none";
  }

  return lines.join("\n");
};

const OPEN = "<";

const CLOSE = ">";

const toBlock = (name: string, body: string): string =>
  `${OPEN}${name}${CLOSE}\n${body}\n${OPEN}/${name}${CLOSE}`;

const toDesignBlock = (designMd: string | null): string[] => {
  if (designMd === null) {
    return [];
  }

  return [toBlock("design-md", designMd.slice(0, DESIGN_MD_CHARS))];
};

const toCritiqueText = (input: PromptInput): string => {
  const rules = toList(input.tasteRules.map((rule) => `- ${rule}`));
  const layers = toList(input.layers.map(toLayerLine));
  const frame = `${input.frameLabel}, ${input.width} x ${input.height} px`;

  const blocks: string[] = [
    toBlock("frame", frame),
    ...toDesignBlock(input.designMd),
    toBlock("taste", rules),
    toBlock("layers", layers),
    "Reply with the JSON object only.",
  ];

  return blocks.join("\n\n");
};

export { CRITIQUE_SYSTEM, toCritiqueText };

export type { PromptInput, PromptLayer };
