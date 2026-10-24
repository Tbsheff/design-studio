import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompiledTokenEntry, DesignSystemState, Project } from '../../shared/contracts';
import { api, errorText } from '../api';
import { findPack, keySwatches, usePacks } from '../packs';
import { usePopover } from '../usePopover';
import { ChangePackDialog, SavePackDialog } from './DesignSystemDialogs';
import { Icon } from './Icon';
import { Swatches } from './Swatches';

export interface DesignSystemRef {
  projectId: string;
  directionId: string | null;
  packId: string | null;
  name: string | null;
}

export function designSystemRef(projectId: string, directionId: string | null, project: Project, state: DesignSystemState | null): DesignSystemRef {
  if (!state) return { projectId, directionId, packId: project.packId ?? null, name: null };
  return { projectId, directionId, packId: state.packId, name: state.manifest?.name ?? null };
}

export interface DesignSystemActions {
  onApply: (packId: string) => Promise<void>;
  onSave: (name: string, packId?: string) => Promise<void>;
}

type Load = { state: DesignSystemState | null; error: string | null };

function ValueCell({ value, color }: { value: string; color: boolean }) {
  return (
    <span className="ds-value">
      {color && <span className="swatch" style={{ background: value }} aria-hidden="true" />}
      <span className="truncate" title={value}>
        {value}
      </span>
    </span>
  );
}

function TokenRow({ entry }: { entry: CompiledTokenEntry }) {
  const color = entry.type === 'color';
  return (
    <li className="ds-row">
      <code className="ds-var">{entry.cssVar}</code>
      <ValueCell value={entry.value} color={color} />
      {entry.darkValue ? <ValueCell value={entry.darkValue} color={color} /> : <span className="ds-none">Same</span>}
    </li>
  );
}

function TokenList({ load }: { load: Load }) {
  if (load.error) return <div className="alert error small" role="alert">Could not load tokens. {load.error} Close this panel and open it again.</div>;
  if (!load.state) {
    return (
      <div className="ds-loading" role="status">
        <span className="spinner" /> Loading tokens…
      </div>
    );
  }
  const { entries, errors } = load.state;
  return (
    <>
      {errors.length > 0 && (
        <ul className="alert error small ds-errors" aria-label="Design system errors">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <div className="ds-cols" aria-hidden="true">
        <span>Variable</span>
        <span>Light</span>
        <span>Dark</span>
      </div>
      <ul className="ds-list" aria-label="Tokens">
        {entries.map((entry) => (
          <TokenRow key={entry.cssVar} entry={entry} />
        ))}
      </ul>
    </>
  );
}

function useDesignSystem(ref: DesignSystemRef, open: boolean): Load {
  const [load, setLoad] = useState<Load>({ state: null, error: null });
  const { projectId, directionId } = ref;
  useEffect(() => {
    if (!open || !directionId) return;
    let live = true;
    api
      .getDesignSystem(projectId, directionId)
      .then((state) => live && setLoad({ state, error: null }))
      .catch((err) => live && setLoad((prev) => ({ state: prev.state, error: errorText(err) })));
    return () => {
      live = false;
    };
  }, [open, projectId, directionId]);
  return load;
}

type Dialog = 'change' | 'save' | null;

export function DesignSystemChip({ system, actions, onOpenDesignMd }: { system: DesignSystemRef; actions: DesignSystemActions; onOpenDesignMd: () => void }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { packs } = usePacks();
  const load = useDesignSystem(system, open);
  const pack = findPack(packs, system.packId);
  const name = system.name ?? pack?.name ?? load.state?.manifest?.name ?? system.packId ?? '';
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, root, close);
  const openDialog = (next: Dialog) => {
    close(false);
    setDialog(next);
  };
  const dialogs = (
    <>
      {dialog === 'change' && <ChangePackDialog currentId={system.packId} onClose={() => setDialog(null)} onApply={actions.onApply} />}
      {dialog === 'save' && <SavePackDialog defaultName={name} onClose={() => setDialog(null)} onSave={actions.onSave} />}
    </>
  );
  if (!system.directionId) return null;
  if (!system.packId) {
    return (
      <>
        <button type="button" className="btn ghost small has-icon ds-add" onClick={() => setDialog('change')}>
          <Icon name="palette" size={14} />
          Add design system
        </button>
        {dialogs}
      </>
    );
  }

  return (
    <div className="ds-chip-wrap" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="btn ghost small ds-chip"
        aria-label={`Design system: ${name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        {pack && <Swatches swatches={keySwatches(pack)} max={4} size="sm" />}
        <span className="ds-chip-name truncate">{name}</span>
      </button>
      {open && (
        <div className="ds-popover" role="dialog" aria-label="Design system">
          <div className="ds-head">
            <div className="ds-titles">
              <strong>{name}</strong>
              {pack && <span>{pack.description}</span>}
            </div>
            <span className="badge">{pack?.source === 'user' ? 'Yours' : 'Read-only'}</span>
          </div>
          <div className="ds-actions">
            <button type="button" className="btn small" onClick={() => openDialog('change')}>
              Change design system…
            </button>
            <button type="button" className="btn small" onClick={() => openDialog('save')}>
              Save to library…
            </button>
          </div>
          <div className="ds-body">
            <TokenList load={load} />
          </div>
          <div className="ds-foot">
            <span className="hint">Source: design-system/tokens.json</span>
            <button
              type="button"
              className="btn small has-icon"
              onClick={() => {
                close(true);
                onOpenDesignMd();
              }}
            >
              <Icon name="doc" size={14} />
              Open DESIGN.md
            </button>
          </div>
        </div>
      )}
      {dialogs}
    </div>
  );
}
