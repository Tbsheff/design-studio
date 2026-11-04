import path from "node:path";
import { pathToFileURL } from "node:url";

export interface AppLayout {
  packaged: boolean;
  ownDir: string;
  serverCwd: string;
  serverArgs: string[];
  resourcesDir: string | null;
  modulesDir: string;
}

export function devLayout(ownDir: string): AppLayout {
  const repoRoot = path.resolve(ownDir, "..", "..");
  const workspaceRoot = path.resolve(repoRoot, "..", "..");

  const loader = path.join(
    workspaceRoot,
    "node_modules",
    "tsx",
    "dist",
    "loader.mjs"
  );

  return {
    modulesDir: path.join(workspaceRoot, "node_modules"),
    ownDir,
    packaged: false,
    resourcesDir: null,
    serverArgs: [
      "--import",
      pathToFileURL(loader).href,
      path.join(repoRoot, "src", "server", "index.ts"),
    ],
    serverCwd: repoRoot,
  };
}

export function packagedLayout(
  ownDir: string,
  resourcesPath: string
): AppLayout {
  const serverDir = path.join(resourcesPath, "server");

  return {
    modulesDir: path.join(serverDir, "node_modules"),
    ownDir,
    packaged: true,
    resourcesDir: resourcesPath,
    serverArgs: [path.join(serverDir, "index.js")],
    serverCwd: serverDir,
  };
}

export function repoDataDir(layout: AppLayout): string {
  return path.join(layout.serverCwd, "studio-data");
}

export function claudeBinary(
  layout: AppLayout,
  arch: string = process.arch
): string {
  return path.join(
    layout.modulesDir,
    "@anthropic-ai",
    `claude-agent-sdk-darwin-${arch}`,
    "claude"
  );
}

export function dugiteDir(layout: AppLayout): string {
  return layout.resourcesDir
    ? path.join(layout.resourcesDir, "git")
    : path.join(layout.modulesDir, "dugite", "git");
}
