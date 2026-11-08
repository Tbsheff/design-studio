import { execFile } from "node:child_process";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const toExcludePath = async (workTree: string): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--git-path", "info/exclude"],
      { cwd: workTree, encoding: "utf-8" }
    );

    return path.resolve(workTree, stdout.trim());
  } catch {
    return null;
  }
};

const toExcludeText = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const insertExcludeEntry = async (
  workTree: string,
  pattern: string
): Promise<boolean> => {
  const file = await toExcludePath(workTree);

  if (file === null) {
    return false;
  }

  const text = await toExcludeText(file);

  if (text.split("\n").includes(pattern)) {
    return true;
  }

  await mkdir(path.dirname(file), { recursive: true });

  let lead = "";

  if (text !== "" && !text.endsWith("\n")) {
    lead = "\n";
  }

  await appendFile(file, `${lead}${pattern}\n`);

  return true;
};

export { insertExcludeEntry };
