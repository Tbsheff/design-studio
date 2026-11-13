import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { PLAY_VIEWER } from "@design-studio/actions/publish-remote";
import type { Direction, Project } from "@design-studio/contracts";

import { loadBridgeScript } from "../preview/index.js";
import { toPublishPlayData, toShellParts } from "../share/index.js";
import { assertClean } from "./bundle.js";

interface PlayViewerInput {
  readonly assets: string;
  readonly direction: Direction;
  readonly project: Project;
  readonly projectDir: (projectId: string) => string;
  readonly secrets: readonly string[];
  readonly uiDir: string;
}

interface PlayViewerFiles {
  readonly bytes: number;
  readonly files: readonly string[];
}

const ROOT_REFERENCE = /(?<quote>["'(])\/(?<target>assets\/|favicon\.svg)/gu;

const UI_ASSETS = "assets";

const toRelativeShell = (html: string): string =>
  html.replaceAll(ROOT_REFERENCE, "$<quote>$<target>");

const toViewerPath = (...parts: readonly string[]): string =>
  [PLAY_VIEWER.dir, ...parts].join("/");

const createViewerText = async (
  input: PlayViewerInput,
  relative: string,
  text: string
): Promise<string> => {
  assertClean(relative, text, [...input.secrets]);
  await writeFile(path.join(input.assets, relative), text);

  return relative;
};

const duplicateUiFile = async (
  input: PlayViewerInput,
  from: string,
  relative: string
): Promise<string> => {
  await copyFile(
    path.join(input.uiDir, from),
    path.join(input.assets, relative)
  );

  return relative;
};

const toByteTotal = async (
  root: string,
  files: readonly string[]
): Promise<number> => {
  const sizes = await Promise.all(
    files.map(async (relative) => {
      const { size } = await stat(path.join(root, relative));

      return size;
    })
  );

  return sizes.reduce((total, size) => total + size, 0);
};

const createPlayViewer = async (
  input: PlayViewerInput
): Promise<PlayViewerFiles | null> => {
  const [shell, data] = await Promise.all([
    toShellParts(input.uiDir),
    toPublishPlayData(
      { projectDir: input.projectDir },
      {
        directionId: input.direction.id,
        project: input.project,
        title: input.project.name,
      }
    ),
  ]);

  if (shell === null || data === null) {
    return null;
  }

  await mkdir(path.join(input.assets, toViewerPath(PLAY_VIEWER.assets)), {
    recursive: true,
  });

  const names = [...shell.assets].toSorted();

  const files = await Promise.all([
    ...names.map((name) =>
      duplicateUiFile(
        input,
        `${UI_ASSETS}/${name}`,
        toViewerPath(PLAY_VIEWER.assets, name)
      )
    ),
    duplicateUiFile(
      input,
      PLAY_VIEWER.favicon,
      toViewerPath(PLAY_VIEWER.favicon)
    ),
    createViewerText(
      input,
      toViewerPath(PLAY_VIEWER.shell),
      toRelativeShell(shell.html)
    ),
    createViewerText(
      input,
      toViewerPath(PLAY_VIEWER.data),
      JSON.stringify(data)
    ),
    createViewerText(
      input,
      toViewerPath(PLAY_VIEWER.bridge),
      await loadBridgeScript()
    ),
  ]);

  return { bytes: await toByteTotal(input.assets, files), files };
};

export { createPlayViewer };

export type { PlayViewerFiles, PlayViewerInput };
