const toOptionalAttr = (
  isShown: boolean,
  value: string
): string | undefined => {
  const values: string[] = [];

  if (isShown) {
    values.push(value);
  }

  return values[0];
};

export { toOptionalAttr };
