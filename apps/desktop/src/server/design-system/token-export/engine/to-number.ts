const LENGTH = /^(?<size>-?(?:\d+(?:\.\d+)?|\.\d+))(?<unit>px|rem)?$/u;

const DURATION = /^(?<size>-?(?:\d+(?:\.\d+)?|\.\d+))(?<unit>ms|s)$/u;

const REM_PX = 16;
const MS_PER_SECOND = 1000;
const NORMAL_WEIGHT = 400;
const BOLD_WEIGHT = 700;

const toWeightWord = (text: string): number | null => {
  if (text === "normal") {
    return NORMAL_WEIGHT;
  }

  if (text === "bold") {
    return BOLD_WEIGHT;
  }

  return null;
};

const toLength = (text: string): number | null => {
  const match = LENGTH.exec(text);

  if (!match?.groups) {
    return null;
  }

  const size = Number(match.groups.size);

  if (match.groups.unit === "rem") {
    return size * REM_PX;
  }

  return size;
};

const toDuration = (text: string): number | null => {
  const match = DURATION.exec(text);

  if (!match?.groups) {
    return toLength(text);
  }

  const size = Number(match.groups.size);

  if (match.groups.unit === "s") {
    return size * MS_PER_SECOND;
  }

  return size;
};

const toNumber = (text: string, type: string): number | null => {
  const trimmed = text.trim().toLowerCase();

  if (type === "fontWeight") {
    return toWeightWord(trimmed) ?? toLength(trimmed);
  }

  if (type === "duration") {
    return toDuration(trimmed);
  }

  return toLength(trimmed);
};

export { toNumber };
