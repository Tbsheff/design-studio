const startInterval = (callback: () => void, stepMs: number): (() => void) => {
  const timer = globalThis.setInterval(callback, stepMs);

  return (): void => globalThis.clearInterval(timer);
};

export { startInterval };
