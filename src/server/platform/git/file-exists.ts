import { access } from "node:fs/promises";

const fileExists = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

export { fileExists };
