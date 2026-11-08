const toOptionalArg = (value: string | null): [] | [string] => {
  if (value === null) {
    return [];
  }

  return [value];
};

export { toOptionalArg };
