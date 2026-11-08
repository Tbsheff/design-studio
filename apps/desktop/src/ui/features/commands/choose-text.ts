const toChoice = <Value>(
  isFirst: boolean,
  first: Value,
  second: Value
): Value => {
  if (isFirst) {
    return first;
  }

  return second;
};

export { toChoice };
