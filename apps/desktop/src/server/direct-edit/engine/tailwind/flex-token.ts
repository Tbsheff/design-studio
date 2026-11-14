const FLEX_TOKENS: readonly (readonly [RegExp, string])[] = [
  [/^(?:1|1 1 0%|1 1 0px|1 1 0)$/u, "flex-1"],
  [/^(?:auto|1 1 auto)$/u, "flex-auto"],
  [/^(?:initial|0 1 auto)$/u, "flex-initial"],
  [/^(?:none|0 0 auto)$/u, "flex-none"],
];

const toFlexToken = (value: string): string => {
  const text = value.trim().replaceAll(/\s+/gu, " ");
  const named = FLEX_TOKENS.find(([pattern]) => pattern.test(text));

  if (named) {
    return named[1];
  }

  const parts = text.split(",").map((part) => part.trim());

  return `flex-[${parts.join(",").replaceAll(" ", "_")}]`;
};

export { toFlexToken };
