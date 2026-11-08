const LAYOUT_PATTERN =
  /^(?:[\w-]+:)*-?(?:m|mx|my|mt|mr|mb|ml|ms|me|w|min-w|max-w|h|min-h|max-h|size|flex|inline-flex|grid|inline-grid|col|row|self|justify-self|place-self|order|basis|grow|shrink|absolute|relative|fixed|sticky|static|inset|inset-x|inset-y|top|right|bottom|left|start|end|z|gap|gap-x|gap-y|space-x|space-y|block|inline|inline-block|hidden|float|items|justify|content|truncate|overflow|sr-only)(?:-.+)?$/u;

const SPACE_PATTERN = /\s+/u;

const toClassTokens = (text: string): string[] =>
  text.split(SPACE_PATTERN).filter((token) => token !== "");

const isModified = (token: string): boolean => token.includes(":");

const isColorToken = (token: string): boolean => {
  if (isModified(token)) {
    return false;
  }

  return (
    token.startsWith("bg-") || token === "border" || token.startsWith("border-")
  );
};

const isSizeToken = (token: string): boolean => {
  if (isModified(token)) {
    return false;
  }

  return (
    token.startsWith("h-") ||
    token.startsWith("size-") ||
    token.startsWith("px-")
  );
};

const isLayoutToken = (token: string): boolean => LAYOUT_PATTERN.test(token);

const isWithin = (
  inner: readonly string[],
  outer: ReadonlySet<string>
): boolean => inner.every((token) => outer.has(token));

export { isColorToken, isLayoutToken, isSizeToken, isWithin, toClassTokens };
