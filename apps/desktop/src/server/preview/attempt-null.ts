const attemptNull = async <Value>(
  task: () => Promise<Value>
): Promise<Value | null> => {
  try {
    return await task();
  } catch {
    return null;
  }
};

const toOptional = (value: string | null): string | undefined => {
  const kept = [value].filter((item): item is string => item !== null);

  return kept.at(0);
};

export { attemptNull, toOptional };
