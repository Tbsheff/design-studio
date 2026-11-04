const MAX_SLUG = 32;

const WORD_CHAR = /[a-z0-9]/u;

const toSlug = (name: string): string => {
  let slug = "";
  let hasGap = false;

  for (const char of name.toLowerCase()) {
    if (WORD_CHAR.test(char)) {
      if (hasGap && slug !== "") {
        slug += "-";
      }

      slug += char;
      hasGap = false;
    } else {
      hasGap = true;
    }
  }

  const clipped = slug.slice(0, MAX_SLUG);

  if (clipped.endsWith("-")) {
    return clipped.slice(0, -1);
  }

  if (clipped === "") {
    return "animation";
  }

  return clipped;
};

const toAnimationId = (name: string, taken: ReadonlySet<string>): string => {
  const base = toSlug(name);

  if (!taken.has(base)) {
    return base;
  }

  let count = 2;

  while (taken.has(`${base}-${count}`)) {
    count += 1;
  }

  return `${base}-${count}`;
};

const toComponentName = (name: string): string => {
  const words = name.split(/[^A-Za-z0-9]+/u).filter((word) => word !== "");

  const joined = words
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join("");

  if (/^[A-Za-z]/u.test(joined)) {
    return `${joined}Animation`;
  }

  return `Motion${joined}Animation`;
};

export { toAnimationId, toComponentName, toSlug };
