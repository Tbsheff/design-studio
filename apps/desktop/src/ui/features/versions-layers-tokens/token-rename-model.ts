const NAME_PATTERN = /^--[a-z][\w-]*$/u;

const toUsesText = (count: number): string => {
  if (count === 1) {
    return "1 use will change";
  }

  return `${count} uses will change`;
};

const toDeleteReason = (count: number): string => {
  if (count === 1) {
    return "Used 1 time. Change that use first.";
  }

  return `Used ${count} times. Change those uses first.`;
};

const isNewNameReady = (current: string, draft: string): boolean =>
  draft !== current && NAME_PATTERN.test(draft);

export { isNewNameReady, toDeleteReason, toUsesText };
