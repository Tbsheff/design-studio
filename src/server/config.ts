import { randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PREVIEW_PORT, DEFAULT_STUDIO_PORT, DEFAULT_VITE_PORT_BASE } from '../shared/contracts.js';
import { resourcesDir } from './resources.js';
import { projectsDirFromEnv } from './store/default-folder.js';
import type { ServerConfig } from './types.js';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readPort(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 65535) {
    throw new Error(`${name} must be a port number, got "${raw}"`);
  }
  return value;
}

function readAgentMode(): ServerConfig['agentMode'] {
  const raw = process.env.STUDIO_AGENT ?? 'sdk';
  if (raw === 'sdk' || raw === 'mock') return raw;
  throw new Error(`STUDIO_AGENT must be "sdk" or "mock", got "${raw}"`);
}

export function loadConfig(): ServerConfig {
  const studioPort = readPort('STUDIO_PORT', DEFAULT_STUDIO_PORT);
  const previewPort = readPort('STUDIO_PREVIEW_PORT', DEFAULT_PREVIEW_PORT);
  const vitePortBase = readPort('STUDIO_VITE_PORT_BASE', DEFAULT_VITE_PORT_BASE);
  const dataDir = path.resolve(process.env.STUDIO_DATA_DIR || path.join(REPO_ROOT, 'studio-data'));
  return {
    dataDir,
    projectsDir: projectsDirFromEnv(process.env.STUDIO_PROJECTS_DIR, os.homedir(), resourcesDir() ? null : REPO_ROOT),
    studioPort,
    previewPort,
    vitePortBase,
    studioToken: randomBytes(32).toString('hex'),
    agentMode: readAgentMode(),
    studioOrigin: `http://127.0.0.1:${studioPort}`,
    previewOrigin: `http://127.0.0.1:${previewPort}`,
    fetchAllowLoopback: process.env.STUDIO_FETCH_ALLOW_LOOPBACK === '1' && !resourcesDir(),
  };
}
