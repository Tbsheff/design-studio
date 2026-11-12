import { access } from "node:fs/promises";

const runFrom = async <Item>(
  iterator: Iterator<Item>,
  run: (item: Item) => Promise<void>
): Promise<void> => {
  const next = iterator.next();

  if (next.done === true) {
    return;
  }

  await run(next.value);
  await runFrom(iterator, run);
};

const runEach = async <Item>(
  items: Iterable<Item>,
  run: (item: Item) => Promise<void>
): Promise<void> => {
  await runFrom(items[Symbol.iterator](), run);
};

const isFile = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const toFirstLine = (text: string): string => text.split("\n")[0] ?? "";

export { isFile, runEach, toFirstLine };
