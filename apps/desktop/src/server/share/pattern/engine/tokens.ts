const VAR_REFERENCE = /var\(\s*(?<name>--[\w-]+)/gu;

const toTokenNames = (source: string): readonly string[] => {
  const names = new Set<string>();

  for (const match of source.matchAll(VAR_REFERENCE)) {
    const name = match.groups?.name ?? "";

    if (name !== "") {
      names.add(name);
    }
  }

  return [...names];
};

const setTokenNames = (
  source: string,
  renames: ReadonlyMap<string, string>
): string =>
  source.replaceAll(VAR_REFERENCE, (whole: string, name: string) => {
    if (!renames.has(name)) {
      return whole;
    }

    return whole.replace(name, renames.get(name) ?? name);
  });

export { setTokenNames, toTokenNames };
