import { readFile } from "node:fs/promises";
import path from "node:path";

import { Result, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";

interface ShellParts {
  readonly assets: ReadonlySet<string>;
  readonly html: string;
}

const SHELL_ENTRY = "share.html";

const MANIFEST_FILE = ".vite/manifest.json";

const ASSET_PREFIX = "assets/";

const ChunkSchema = Schema.Struct({
  assets: Schema.optionalKey(Schema.Array(Schema.String)),
  css: Schema.optionalKey(Schema.Array(Schema.String)),
  dynamicImports: Schema.optionalKey(Schema.Array(Schema.String)),
  file: Schema.String,
  imports: Schema.optionalKey(Schema.Array(Schema.String)),
});

const ManifestSchema = Schema.Record(Schema.String, ChunkSchema);

type Manifest = typeof ManifestSchema.Type;

const decodeManifest = toDecoder(ManifestSchema, "ignore");

const toChunkFiles = (
  manifest: Manifest,
  key: string,
  seen: Set<string>,
  files: Set<string>
): void => {
  const chunk = manifest[key];

  if (seen.has(key) || !chunk) {
    return;
  }

  seen.add(key);

  for (const file of [
    chunk.file,
    ...(chunk.css ?? []),
    ...(chunk.assets ?? []),
  ]) {
    files.add(file);
  }

  for (const next of [
    ...(chunk.imports ?? []),
    ...(chunk.dynamicImports ?? []),
  ]) {
    toChunkFiles(manifest, next, seen, files);
  }
};

const toAssetSet = (manifest: Manifest): Set<string> => {
  const files = new Set<string>();

  toChunkFiles(manifest, SHELL_ENTRY, new Set<string>(), files);

  const names = new Set<string>();

  for (const file of files) {
    if (file.startsWith(ASSET_PREFIX)) {
      names.add(file.slice(ASSET_PREFIX.length));
    }
  }

  return names;
};

const toShellParts = async (uiDir: string): Promise<ShellParts | null> => {
  try {
    const [html, manifestText] = await Promise.all([
      readFile(path.join(uiDir, SHELL_ENTRY), "utf-8"),
      readFile(path.join(uiDir, MANIFEST_FILE), "utf-8"),
    ]);

    const decoded = decodeManifest(JSON.parse(manifestText));

    if (Result.isFailure(decoded)) {
      return null;
    }

    return { assets: toAssetSet(decoded.success), html };
  } catch {
    return null;
  }
};

export { toShellParts };

export type { ShellParts };
