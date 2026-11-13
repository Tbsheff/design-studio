import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PortCheckFiles } from "./port-check-query.js";

interface PortPictures {
  readonly app: Buffer;
  readonly diff: Buffer;
  readonly prototype: Buffer;
}

const STEM_RADIX = 36;

const toSafeStem = (text: string): string =>
  text.replaceAll(/[^A-Za-z0-9_-]/gu, "");

const toPortFileStem = (projectId: string, targetProjectId: string): string =>
  [
    toSafeStem(projectId),
    toSafeStem(targetProjectId),
    Date.now().toString(STEM_RADIX),
  ].join("-");

const createPortFiles = async (
  dir: string,
  stem: string,
  pictures: PortPictures
): Promise<PortCheckFiles> => {
  await mkdir(dir, { recursive: true });

  const files: PortCheckFiles = {
    appPath: path.join(dir, `${stem}-app.png`),
    diffPath: path.join(dir, `${stem}-diff.png`),
    prototypePath: path.join(dir, `${stem}-prototype.png`),
  };

  await Promise.all([
    writeFile(files.appPath, pictures.app),
    writeFile(files.diffPath, pictures.diff),
    writeFile(files.prototypePath, pictures.prototype),
  ]);

  return files;
};

export { createPortFiles, toPortFileStem };

export type { PortPictures };
