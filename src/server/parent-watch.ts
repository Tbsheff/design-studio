const PARENT_PID_ENV = 'STUDIO_PARENT_PID';
const POLL_MS = 1000;

export function watchParent(onGone: () => void, env: NodeJS.ProcessEnv = process.env): NodeJS.Timeout | null {
  const parent = Number(env[PARENT_PID_ENV]);
  if (!Number.isInteger(parent) || parent <= 0) return null;
  const timer = setInterval(() => {
    if (process.ppid === parent) return;
    clearInterval(timer);
    onGone();
  }, POLL_MS);
  timer.unref();
  process.once('disconnect', () => {
    clearInterval(timer);
    onGone();
  });
  return timer;
}
