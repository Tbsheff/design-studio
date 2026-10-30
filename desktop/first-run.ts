import { execFile } from 'node:child_process';
import path from 'node:path';
import { BrowserWindow, clipboard, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { setupBackground } from './theme.js';
import { MAC_CHROME } from './window.js';
import { CLAUDE_INSTALL_COMMAND, FIX_ACTIONS, needsAttention, runChecks, type CheckInputs, type CheckResult, type FixAction } from './setup-checks.js';

export interface SetupWindowOptions {
  ownDir: string;
  inputs: () => Promise<CheckInputs>;
  continueLabel: string;
}

const FIRST_RUN_FILE = 'first-run.html';
const TERMINAL_APP = '/System/Applications/Utilities/Terminal.app';

let current: { window: BrowserWindow; options: SetupWindowOptions } | null = null;

function fromSetupWindow(event: IpcMainInvokeEvent): boolean {
  return !!current && event.sender === current.window.webContents && event.senderFrame?.url.endsWith(`/${FIRST_RUN_FILE}`) === true;
}

async function applyFix(action: FixAction, inputs: CheckInputs): Promise<void> {
  if (action === 'copy-claude') clipboard.writeText('claude');
  if (action === 'copy-claude-install') clipboard.writeText(CLAUDE_INSTALL_COMMAND);
  if (action === 'open-terminal') await shell.openPath(TERMINAL_APP);
  if (action === 'reveal-data') shell.showItemInFolder(inputs.dataDir);
  if (action === 'install-clt') execFile('/usr/bin/xcode-select', ['--install'], () => undefined);
}

function isFixAction(value: unknown): value is FixAction {
  return typeof value === 'string' && (FIX_ACTIONS as readonly string[]).includes(value);
}

export function registerSetupIpc(): void {
  ipcMain.handle('setup:run', async (event) => {
    if (!fromSetupWindow(event) || !current) return [];
    return runChecks(await current.options.inputs());
  });
  ipcMain.handle('setup:fix', async (event, action: unknown) => {
    if (!fromSetupWindow(event) || !current || !isFixAction(action)) return;
    await applyFix(action, await current.options.inputs());
  });
  ipcMain.handle('setup:info', (event) => (fromSetupWindow(event) && current ? { continueLabel: current.options.continueLabel } : null));
  ipcMain.handle('setup:continue', (event) => {
    if (fromSetupWindow(event)) current?.window.close();
  });
}

export function openSetupWindow(options: SetupWindowOptions): Promise<void> {
  if (current) {
    current.window.focus();
    return Promise.resolve();
  }
  const window = new BrowserWindow({
    width: 600,
    height: 680,
    minWidth: 480,
    minHeight: 420,
    resizable: true,
    show: false,
    title: 'Design Studio setup',
    backgroundColor: setupBackground(),
    ...(process.platform === 'darwin' ? MAC_CHROME : {}),
    webPreferences: { preload: path.join(options.ownDir, 'first-run-preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  console.log(`[desktop] window: setup (${options.continueLabel})`);
  return new Promise((resolve) => {
    current = { window, options };
    window.once('ready-to-show', () => window.show());
    window.on('closed', () => {
      current = null;
      resolve();
    });
    void window.loadFile(path.join(options.ownDir, FIRST_RUN_FILE));
  });
}

export async function setupNeeded(inputs: CheckInputs): Promise<{ needed: boolean; results: CheckResult[] }> {
  const results = await runChecks(inputs);
  return { needed: needsAttention(results), results };
}
