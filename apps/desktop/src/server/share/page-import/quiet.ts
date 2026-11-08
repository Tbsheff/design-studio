const toQuietly = async <Value>(
  work: Promise<Value>
): Promise<Value | null> => {
  try {
    return await work;
  } catch {
    return null;
  }
};

const toLetRun = (work: Promise<unknown>): void => {
  toQuietly(work);
};

export { toLetRun as letRun, toQuietly as quietly };
