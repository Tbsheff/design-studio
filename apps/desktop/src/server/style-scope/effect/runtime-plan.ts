import { readdir } from "node:fs/promises";
import path from "node:path";

import type { WrittenFile } from "./deps.js";
import { toScriptedHtml } from "./engine/index.js";
import { SHADER_RUNTIME_NAME, SHADER_SCRIPT } from "./shader-script.js";
import { getTextOrNull } from "./sheet.js";

interface RuntimeHost {
  readonly code: string;
  readonly relative: string;
}

interface RuntimeChange extends RuntimeHost {
  readonly original: string;
}

interface RuntimePlan {
  readonly hasRuntime: boolean;
  readonly host: RuntimeChange | null;
  readonly written: WrittenFile[];
}

const ROOT_PAGE = "index.html";

const FX_FOLDER = "fx";

const toNames = async (folder: string): Promise<string[]> => {
  try {
    return await readdir(folder);
  } catch {
    return [];
  }
};

const toIsVite = async (workTree: string): Promise<boolean> => {
  const manifest = await getTextOrNull(path.join(workTree, "package.json"));

  if (manifest !== null && manifest.includes('"vite"')) {
    return true;
  }

  const names = await toNames(workTree);

  return names.some((name) => name.startsWith("vite.config"));
};

const toAssetWrites = async (
  workTree: string,
  relative: string
): Promise<WrittenFile[]> => {
  const file = path.join(workTree, relative);
  const current = await getTextOrNull(file);

  if (current === SHADER_SCRIPT) {
    return [];
  }

  return [
    {
      code: SHADER_SCRIPT,
      created: current === null,
      original: current ?? "",
      target: { file, relative },
    },
  ];
};

const toSourceRef = (
  isVite: boolean,
  hostRelative: string,
  assetRelative: string
): string => {
  if (isVite) {
    return `/${FX_FOLDER}/${SHADER_RUNTIME_NAME}`;
  }

  return path.posix.relative(path.posix.dirname(hostRelative), assetRelative);
};

const toAssetRelative = (isVite: boolean): string => {
  if (isVite) {
    return path.posix.join("public", FX_FOLDER, SHADER_RUNTIME_NAME);
  }

  return path.posix.join(FX_FOLDER, SHADER_RUNTIME_NAME);
};

const toHost = async (
  workTree: string,
  target: RuntimeHost | null
): Promise<RuntimeHost | null> => {
  if (target !== null && /\.html?$/iu.test(target.relative)) {
    return target;
  }

  const code = await getTextOrNull(path.join(workTree, ROOT_PAGE));

  if (code === null) {
    return null;
  }

  return { code, relative: ROOT_PAGE };
};

const toShaderRuntimePlan = async (
  workTree: string,
  target: RuntimeHost | null
): Promise<RuntimePlan> => {
  const host = await toHost(workTree, target);

  if (host === null) {
    return { hasRuntime: false, host: null, written: [] };
  }

  const isVite = await toIsVite(workTree);

  const assetRelative = toAssetRelative(isVite);

  const scripted = toScriptedHtml(
    host.code,
    toSourceRef(isVite, host.relative, assetRelative)
  );

  if (scripted === null) {
    return { hasRuntime: false, host: null, written: [] };
  }

  return {
    hasRuntime: true,
    host: { code: scripted, original: host.code, relative: host.relative },
    written: await toAssetWrites(workTree, assetRelative),
  };
};

export { toShaderRuntimePlan };

export type { RuntimeChange, RuntimeHost, RuntimePlan };
