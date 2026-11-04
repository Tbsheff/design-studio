type KeyedMutex = <Result>(
  key: string,
  task: () => Promise<Result>
) => Promise<Result>;

const runAfter = async <Result>(
  previous: Promise<unknown>,
  task: () => Promise<Result>
): Promise<Result> => {
  await Promise.allSettled([previous]);

  return task();
};

const dropWhenSettled = async (
  tails: Map<string, Promise<unknown>>,
  key: string,
  tail: Promise<unknown>
): Promise<void> => {
  await tail;

  if (tails.get(key) === tail) {
    tails.delete(key);
  }
};

const createKeyedMutex = (): KeyedMutex => {
  const tails = new Map<string, Promise<unknown>>();

  return <Result>(
    key: string,
    task: () => Promise<Result>
  ): Promise<Result> => {
    const previous = tails.get(key) ?? Promise.resolve();
    const result = runAfter(previous, task);
    const tail = Promise.allSettled([result]);

    tails.set(key, tail);
    void dropWhenSettled(tails, key, tail);

    return result;
  };
};

export { createKeyedMutex };
