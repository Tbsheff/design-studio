const quietly = async <Value>(work: Promise<Value>): Promise<Value | null> => {
  try {
    return await work;
  } catch {
    return null;
  }
};

const letRun = (work: Promise<unknown>): void => {
  quietly(work);
};

export { letRun, quietly };
