import { readFile } from "node:fs/promises";
import path from "node:path";

const DESIGN_MD_FILE = "DESIGN.md";

const toDesignMdText = async (workTree: string): Promise<string | null> => {
  try {
    return await readFile(path.join(workTree, DESIGN_MD_FILE), "utf-8");
  } catch {
    return null;
  }
};

export { toDesignMdText };
