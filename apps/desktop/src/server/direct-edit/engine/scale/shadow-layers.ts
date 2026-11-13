const CLEAR_COLORS: readonly string[] = [
  "rgba(0, 0, 0, 0)",
  "transparent",
  "oklab(0 0 0 / 0)",
];

const ZERO_LENGTH = /^-?0(?:\.0+)?px$/u;

const PX_END = "px";

const toLayers = (text: string): string[] => {
  const layers: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of text) {
    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;
    }

    if (char === "," && depth === 0) {
      layers.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  return [...layers, current.trim()];
};

const isClearLayer = (layer: string): boolean => {
  if (CLEAR_COLORS.some((color) => layer.includes(color))) {
    return true;
  }

  const lengths = layer.split(" ").filter((part) => part.endsWith(PX_END));

  return lengths.length > 0 && lengths.every((part) => ZERO_LENGTH.test(part));
};

const toVisibleShadow = (text: string): string | null => {
  const layers = toLayers(text).filter((layer) => !isClearLayer(layer));

  if (layers.length === 0) {
    return null;
  }

  return layers.join(", ");
};

export { toVisibleShadow };
