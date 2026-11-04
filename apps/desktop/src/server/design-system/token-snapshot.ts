import { access, readFile } from "node:fs/promises";
import path from "node:path";

interface FileSnapshot {
  content: string | null;
  relative: string;
}

const fileExists = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const readSnapshot = async (
  workTree: string,
  relative: string
): Promise<FileSnapshot> => {
  const file = path.join(workTree, relative);
  let content: string | null = null;

  if (await fileExists(file)) {
    content = await readFile(file, "utf-8");
  }

  return { content, relative };
};

export { readSnapshot };

export type { FileSnapshot };
