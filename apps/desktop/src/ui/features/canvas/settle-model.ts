const toValueOr = async <Value, Fallback>(
  pending: PromiseLike<Value>,
  fallback: Fallback
): Promise<Value | Fallback> => {
  try {
    return await pending;
  } catch {
    return fallback;
  }
};

const runOrReport = async (
  pending: PromiseLike<unknown>,
  report: (error: Error) => void
): Promise<void> => {
  try {
    await pending;
  } catch (error: unknown) {
    if (error instanceof Error) {
      report(error);

      return;
    }

    report(new Error(String(error)));
  }
};

export { runOrReport, toValueOr };
