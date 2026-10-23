import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BrowserWindow, screen } from 'electron';
import { parseStateFile, pickState, recordState, type DisplayInfo, type WindowState, type WindowStateFile } from './window-state.js';

export interface WindowOptions {
  url: string;
  preload: string;
  stateFile: string;
  version: string;
}

const DEFAULT_SIZE = { width: 1440, height: 900 };
const SAVE_DELAY_MS = 400;

function displays(): DisplayInfo[] {
  return screen.getAllDisplays().map((display) => ({ id: display.id, bounds: display.bounds, workArea: display.workArea }));
}

function readStateFile(file: string): WindowStateFile {
  try {
    return parseStateFile(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    return parseStateFile(null);
  }
}

export function readWindowState(file: string): WindowState | null {
  return pickState(readStateFile(file), displays());
}

function writeWindowState(file: string, window: BrowserWindow): void {
  if (window.isDestroyed()) return;
  const state: WindowState = { bounds: window.getNormalBounds(), maximized: window.isMaximized() };
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(recordState(readStateFile(file), displays(), state), null, 2)}\n`);
}

function trackState(window: BrowserWindow, file: string): void {
  let timer: NodeJS.Timeout | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => writeWindowState(file, window), SAVE_DELAY_MS);
  };
  for (const event of ['resize', 'move', 'maximize', 'unmaximize'] as const) window.on(event as 'resize', schedule);
  window.on('close', () => {
    clearTimeout(timer);
    writeWindowState(file, window);
  });
}

export function createMainWindow(options: WindowOptions): BrowserWindow {
  const saved = readWindowState(options.stateFile);
  const window = new BrowserWindow({
    ...(saved ? saved.bounds : DEFAULT_SIZE),
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'Design Studio',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: options.preload,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      additionalArguments: [`--studio-version=${options.version}`],
    },
  });
  if (saved?.maximized) window.maximize();
  trackState(window, options.stateFile);
  window.once('ready-to-show', () => window.show());
  void window.loadURL(options.url);
  return window;
}
