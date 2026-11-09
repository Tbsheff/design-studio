const DECIMAL = 10;

const toKilobytes = (output: string): number | null => {
  const first = output.trim().split(/\s+/u).at(0) ?? "";
  const value = Number.parseInt(first, DECIMAL);

  if (Number.isNaN(value)) {
    return null;
  }

  return value;
};

export { toKilobytes };
