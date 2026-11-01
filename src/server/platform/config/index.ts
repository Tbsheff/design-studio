import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_PREVIEW_PORT,
  DEFAULT_STUDIO_PORT,
  DEFAULT_VITE_PORT_BASE,
} from "../../../shared/contracts.js";

interface ServerConfig {
  dataDir: string;
  projectsDir: string;
  studioPort: number;
  previewPort: number;
  vitePortBase: number;
  appPortBase?: number;
  appPortCount?: number;
  studioToken: string;
  agentMode: "sdk" | "mock";
  studioOrigin: string;
  previewOrigin: string;
  fetchAllowLoopback?: boolean;
}

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..", "..");

const DEFAULT_FOLDER_NAME = "Design Studio";
const DEV_PROJECTS_FOLDER = "studio-projects";
const APP_PORT_OFFSET = 400;
const DEFAULT_APP_PORT_COUNT = 200;
const MAX_PORT = 65_535;
const MAX_PORT_COUNT = 10_000;
const TOKEN_BYTES = 32;

const resourcesDir = (env: NodeJS.ProcessEnv = process.env): string | null => {
  const raw = env.STUDIO_RESOURCES_DIR;

  if (!raw) {
    return null;
  }

  return path.resolve(raw);
};

const projectsDirFromEnv = (
  envValue: string | undefined,
  homeDir: string,
  devRoot: string | null
): string => {
  const value = envValue ?? "";

  if (value.trim() !== "" && path.isAbsolute(value)) {
    return path.resolve(value);
  }

  if (devRoot) {
    return path.join(devRoot, DEV_PROJECTS_FOLDER);
  }

  return path.join(homeDir, DEFAULT_FOLDER_NAME);
};

const readPort = (name: string, fallback: number): number => {
  const raw = process.env[name] ?? "";

  if (raw === "") {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0 || value > MAX_PORT) {
    throw new Error(`${name} must be a port number, got "${raw}"`);
  }

  return value;
};

const readPortCount = (name: string, fallback: number): number => {
  const raw = process.env[name] ?? "";

  if (raw === "") {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 1 || value > MAX_PORT_COUNT) {
    throw new Error(
      `${name} must be a whole number from 1 to 10000, got "${raw}"`
    );
  }

  return value;
};

const readAgentMode = (): ServerConfig["agentMode"] => {
  const raw = process.env.STUDIO_AGENT ?? "sdk";

  if (raw === "sdk" || raw === "mock") {
    return raw;
  }

  throw new Error(`STUDIO_AGENT must be "sdk" or "mock", got "${raw}"`);
};

const devProjectsRoot = (): string | null => {
  if (resourcesDir()) {
    return null;
  }

  return REPO_ROOT;
};

const loadConfig = (): ServerConfig => {
  const studioPort = readPort("STUDIO_PORT", DEFAULT_STUDIO_PORT);

  const previewPort = readPort("STUDIO_PREVIEW_PORT", DEFAULT_PREVIEW_PORT);

  const vitePortBase = readPort(
    "STUDIO_VITE_PORT_BASE",
    DEFAULT_VITE_PORT_BASE
  );

  const appPortBase = readPort(
    "STUDIO_APP_PORT_BASE",
    vitePortBase + APP_PORT_OFFSET
  );

  const appPortCount = readPortCount(
    "STUDIO_APP_PORT_COUNT",
    DEFAULT_APP_PORT_COUNT
  );

  const dataDir = path.resolve(
    process.env.STUDIO_DATA_DIR || path.join(REPO_ROOT, "studio-data")
  );

  const projectsDir = projectsDirFromEnv(
    process.env.STUDIO_PROJECTS_DIR,
    os.homedir(),
    devProjectsRoot()
  );

  const studioToken = randomBytes(TOKEN_BYTES).toString("hex");

  const agentMode = readAgentMode();

  const studioOrigin = `http://127.0.0.1:${studioPort}`;

  const previewOrigin = `http://127.0.0.1:${previewPort}`;

  const fetchAllowLoopback =
    process.env.STUDIO_FETCH_ALLOW_LOOPBACK === "1" && !resourcesDir();

  return {
    agentMode,
    appPortBase,
    appPortCount,
    dataDir,
    fetchAllowLoopback,
    previewOrigin,
    previewPort,
    projectsDir,
    studioOrigin,
    studioPort,
    studioToken,
    vitePortBase,
  };
};

export {
  DEFAULT_FOLDER_NAME,
  DEV_PROJECTS_FOLDER,
  REPO_ROOT,
  loadConfig,
  projectsDirFromEnv,
  resourcesDir,
};

export type { ServerConfig };
