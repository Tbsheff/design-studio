const settle = async <Value>(
  task: Promise<Value>,
  onValue: (value: Value) => void,
  onFailure: (failure: Error) => void
): Promise<void> => {
  const [outcome] = await Promise.allSettled([task] as const);

  if (outcome.status === "fulfilled") {
    onValue(outcome.value);

    return;
  }

  onFailure(outcome.reason);
};

const catchFailure = (
  task: Promise<unknown>,
  onFailure: (failure: Error) => void
): Promise<void> => settle(task, () => null, onFailure);

const settleValue = <Value>(
  task: Promise<Value>,
  onValue: (value: Value) => void
): Promise<void> => settle(task, onValue, () => null);

const ignoreFailure = (task: Promise<unknown>): Promise<void> =>
  settle(
    task,
    () => null,
    () => null
  );

export { catchFailure, ignoreFailure, settle, settleValue };
