import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BrowserWindow, ipcMain, nativeTheme } from 'electron';

export type ThemePref = 'system' | 'light' | 'dark';

export const THEME_IPC = { get: 'studio:theme-get', set: 'studio:theme-set' } as const;

const STUDIO_PAINT = { light: '#f6f8fa', dark: '#191c1f' };
const SETUP_PAINT = { light: '#fbfcfe', dark: '#141619' };

let file: string | null = null;
let pref: ThemePref = 'system';
const painted = new Set<BrowserWindow>();

function valid(value: unknown): ThemePref | null {
  return value === 'system' || value === 'light' || value === 'dark' ? value : null;
}

function isDark(): boolean {
  return pref === 'dark' || (pref === 'system' && nativeTheme.shouldUseDarkColors);
}

export function studioBackground(): string {
  return isDark() ? STUDIO_PAINT.dark : STUDIO_PAINT.light;
}

export function setupBackground(): string {
  return nativeTheme.shouldUseDarkColors ? SETUP_PAINT.dark : SETUP_PAINT.light;
}

function repaint(): void {
  const color = studioBackground();
  for (const window of painted) if (!window.isDestroyed()) window.setBackgroundColor(color);
}

export function trackThemeWindow(window: BrowserWindow): void {
  painted.add(window);
  window.on('closed', () => painted.delete(window));
}

export function initTheme(themeFile: string): void {
  if (file) return;
  file = themeFile;
  try {
    pref = valid((JSON.parse(readFileSync(themeFile, 'utf8')) as { theme?: unknown }).theme) ?? 'system';
  } catch {
    pref = 'system';
  }
  ipcMain.on(THEME_IPC.get, (event) => {
    event.returnValue = pref;
  });
  ipcMain.on(THEME_IPC.set, (_event, raw: unknown) => {
    const next = valid(raw);
    if (!next || next === pref) return;
    pref = next;
    try {
      mkdirSync(path.dirname(themeFile), { recursive: true });
      writeFileSync(themeFile, `${JSON.stringify({ theme: pref })}\n`);
    } catch (err) {
      console.warn(`[desktop] theme: could not save ${String(err)}`);
    }
    repaint();
  });
  nativeTheme.on('updated', repaint);
}
