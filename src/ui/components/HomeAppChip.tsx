import { useCallback, useEffect, useState } from 'react';
import type { FolderInspection } from '../../shared/open-app';
import { api, errorText } from '../api';
import { Icon } from './Icon';

export type RunMode = 'start' | 'url';

export interface AppChip {
  path: string;
  inspection: FolderInspection | null;
  checking: boolean;
  error: string | null;
  appDir: string | null;
  mode: RunMode;
  url: string;
  env: string;
  nonce: number;
}

const KIND_LABEL: Record<NonNullable<FolderInspection['kind']>, string> = { next: 'Next.js', vite: 'Vite', html: 'HTML', tokens: 'Tokens' };

export function chipProblem(chip: AppChip | null): string | null {
  if (!chip || chip.checking) return null;
  return chip.error ?? chip.inspection?.problem ?? null;
}

export function chipBlocker(chip: AppChip | null): { command: string; dir: string } | null {
  const found = chip?.inspection;
  if (!found || found.problem || found.depsInstalled !== false || !found.install) return null;
  if (found.kind === 'next' && chip.mode === 'url') return null;
  return found.install;
}

export function chipName(chip: AppChip): string {
  return chip.inspection?.name ?? chip.path.split('/').filter(Boolean).pop() ?? chip.path;
}

function chipLabel(chip: AppChip): string {
  if (chip.checking && !chip.inspection) return 'Checking…';
  if (chipProblem(chip)) return 'Not an app folder';
  const found = chip.inspection;
  if (!found?.kind) return '';
  const dir = chip.appDir ?? found.appDir;
  return dir && dir !== '.' ? `${KIND_LABEL[found.kind]} · ${dir}` : KIND_LABEL[found.kind];
}

interface DropBridge {
  pathForFile?: (file: File) => string;
}

export function droppedFolder(data: DataTransfer): { path: string } | { unsupported: true } | null {
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file' || !item.webkitGetAsEntry()?.isDirectory) continue;
    const file = item.getAsFile();
    const path = file ? ((window as unknown as { studioDesktop?: DropBridge }).studioDesktop?.pathForFile?.(file) ?? '') : '';
    return path ? { path } : { unsupported: true };
  }
  return null;
}

export function useAppChip() {
  const [chip, setChip] = useState<AppChip | null>(null);
  const set = useCallback((path: string) => setChip({ path, inspection: null, checking: true, error: null, appDir: null, mode: 'start', url: '', env: '', nonce: 0 }), []);
  const clear = useCallback(() => setChip(null), []);
  const update = useCallback((patch: Partial<AppChip>) => setChip((current) => (current ? { ...current, ...patch } : current)), []);
  const path = chip?.path ?? null;
  const appDir = chip?.appDir ?? null;
  const nonce = chip?.nonce ?? 0;
  useEffect(() => {
    if (!path) return;
    let live = true;
    setChip((current) => (current ? { ...current, checking: true, error: null } : current));
    api
      .inspectFolder(path, appDir ?? undefined)
      .then((inspection) => live && setChip((current) => (current?.path === path ? { ...current, inspection, checking: false } : current)))
      .catch((err: unknown) => live && setChip((current) => (current?.path === path ? { ...current, error: errorText(err), checking: false } : current)));
    return () => {
      live = false;
    };
  }, [path, appDir, nonce]);
  return { chip, set, clear, update };
}

export function AppChipView({ chip, menuOpen, onMenu, onRemove }: { chip: AppChip; menuOpen: boolean; onMenu: () => void; onRemove: () => void }) {
  const name = chipName(chip);
  const bad = chipProblem(chip) !== null || chipBlocker(chip) !== null;
  return (
    <li className={`home-chip app${bad ? ' warn' : ''}`}>
      <button type="button" className="home-chip-app" aria-haspopup="dialog" aria-expanded={menuOpen} aria-label={`App options for ${name}`} data-tip={chip.inspection?.path ?? chip.path} data-tip-align="start" onClick={onMenu}>
        <span className="home-chip-fi" aria-hidden="true">
          <Icon name="code" size={12} />
        </span>
        <b className="truncate">{name}</b>
        <span className="home-chip-host truncate">{chipLabel(chip)}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      <button type="button" className="home-chip-remove" aria-label={`Remove ${name}`} onClick={onRemove}>
        <Icon name="close" size={12} />
      </button>
    </li>
  );
}
