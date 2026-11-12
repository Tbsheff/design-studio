const PARENT_PID_ENV = "STUDIO_PARENT_PID";
const POLL_MS = 1000;

const watchParent = (
  onGone: () => void,
  env: NodeJS.ProcessEnv = process.env
): NodeJS.Timeout | null => {
  const parent = Number(env[PARENT_PID_ENV]);

  if (!Number.isInteger(parent) || parent <= 0) {
    return null;
  }

  process.once("disconnect", onGone);

  if (process.connected) {
    return null;
  }

  const timer = setInterval(() => {
    if (process.ppid === parent) {
      return;
    }

    clearInterval(timer);
    onGone();
  }, POLL_MS);

  timer.unref();

  return timer;
};

export { watchParent };
