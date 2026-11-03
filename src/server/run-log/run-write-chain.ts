import { mkdir } from "node:fs/promises";

interface RunWriteChain {
  readonly enqueue: (task: () => Promise<void>) => void;
  readonly flush: () => Promise<void>;
}

interface ChainState {
  failure: Error | null;
  tail: Promise<void>;
}

const settle = async (
  state: ChainState,
  task: () => Promise<void>
): Promise<void> => {
  await state.tail;

  try {
    await task();
  } catch (error) {
    state.failure ??= new Error("Run log write failed.", { cause: error });
  }
};

const prepare = async (dir: string): Promise<void> => {
  await mkdir(dir, { recursive: true });
};

const openRunWriteChain = (dir: string): RunWriteChain => {
  const state: ChainState = { failure: null, tail: prepare(dir) };

  const enqueue = (task: () => Promise<void>): void => {
    state.tail = settle(state, task);
  };

  const flush = async (): Promise<void> => {
    await state.tail;

    if (state.failure !== null) {
      throw state.failure;
    }
  };

  return { enqueue, flush };
};

export { openRunWriteChain };

export type { RunWriteChain };
