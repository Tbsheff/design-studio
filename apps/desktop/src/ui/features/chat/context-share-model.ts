const LARGE_WINDOW = 1_000_000;
const DEFAULT_WINDOW = 200_000;
const PERCENT = 100;
const DANGER_FROM = 0.9;
const WARN_FROM = 0.7;

const contextWindowFor = (model: string): number => {
  if (/\[1m\]|-1m\b/iu.test(model)) {
    return LARGE_WINDOW;
  }

  return DEFAULT_WINDOW;
};

const contextShare = (tokens: number, model: string): number =>
  Math.min(1, Math.max(0, tokens / contextWindowFor(model)));

export { DANGER_FROM, PERCENT, WARN_FROM, contextShare, contextWindowFor };
