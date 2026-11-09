const FIRST_SUFFIX = 2;

const MAX_TRIES = 500;

const toFreeName = (name: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(name)) {
    return name;
  }

  for (let suffix = FIRST_SUFFIX; suffix < MAX_TRIES; suffix += 1) {
    const candidate = `${name}-${suffix}`;

    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${name}-${Date.now()}`;
};

export { toFreeName };
