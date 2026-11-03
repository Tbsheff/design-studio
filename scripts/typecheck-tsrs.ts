import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

import { toTsconfigProjects } from "./tsconfig-projects.ts";

const TSRS = fileURLToPath(
  new URL("../node_modules/.bin/tsrs", import.meta.url)
);

const isProjectClean = async (project: string): Promise<boolean> => {
  const child = spawn(TSRS, ["--noEmit", "-p", project], { stdio: "inherit" });
  const [code] = await once(child, "exit");

  return code === 0;
};

const runTsrsProjects = async (): Promise<number> => {
  const projects = await toTsconfigProjects();

  const results = await Promise.all(
    projects.map((project) => isProjectClean(project))
  );

  const failed = projects.filter((_project, index) => results[index] !== true);

  if (failed.length === 0) {
    return 0;
  }

  process.stdout.write(
    `typecheck:tsrs failed: ${failed.join(", ")}\nfix: pnpm run typecheck:tsrs\n`
  );

  return 1;
};

process.exitCode = await runTsrsProjects();
