import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { EditorId, EditorInfo } from '../../shared/export.js';
import { BadRequestError } from '../store/errors.js';

const EDITORS: { id: EditorId; name: string; app: string }[] = [
  { id: 'cursor', name: 'Cursor', app: 'Cursor' },
  { id: 'vscode', name: 'VS Code', app: 'Visual Studio Code' },
  { id: 'zed', name: 'Zed', app: 'Zed' },
];

function installed(app: string): boolean {
  return [path.join('/Applications', `${app}.app`), path.join(os.homedir(), 'Applications', `${app}.app`)].some((candidate) => existsSync(candidate));
}

export function listEditors(): EditorInfo[] {
  if (process.platform !== 'darwin') return [];
  return EDITORS.filter((editor) => installed(editor.app)).map(({ id, name }) => ({ id, name }));
}

export function openInEditor(id: unknown, folder: string, file?: string): Promise<void> {
  const editor = EDITORS.find((e) => e.id === id);
  if (!editor) throw new BadRequestError('editor must be cursor, vscode or zed');
  if (process.platform !== 'darwin' || !installed(editor.app)) throw new BadRequestError(`${editor.name} is not installed`);
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/open', ['-a', editor.app, folder, ...(file ? [file] : [])], { timeout: 10_000 }, (error) => (error ? reject(new Error(`could not open ${editor.name}`)) : resolve()));
  });
}

export function revealInFinder(target: string): Promise<void> {
  if (process.platform !== 'darwin') return Promise.reject(new BadRequestError('Reveal works on macOS only'));
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/open', ['-R', target], { timeout: 10_000 }, (error) => (error ? reject(new Error('could not reveal the folder')) : resolve()));
  });
}
