const toChoiceTabIndex = (
  picked: string,
  index: number,
  rovingIndex: number
): number => {
  if (picked !== "") {
    return rovingIndex;
  }

  if (index === 0) {
    return 0;
  }

  return -1;
};

const toModKey = (): string => {
  const platform = globalThis.navigator?.platform ?? "";

  if (/Mac|iPhone|iPad/u.test(platform)) {
    return "⌘";
  }

  return "Ctrl+";
};

export { toChoiceTabIndex, toModKey };
