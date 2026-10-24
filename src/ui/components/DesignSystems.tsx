import { useEffect, useRef, useState } from 'react';
import type { PackProblem, PackSummary } from '../../shared/contracts';
import { ApiError, api, errorText } from '../api';
import { downloadBlob } from '../format';
import { fontStack, refreshPacks, usePacks } from '../packs';
import { uiStore, type LibraryFrom } from '../storage';
import { Icon } from './Icon';
import { DeletePackDialog, ImportConflictDialog, RenamePackDialog } from './LibraryDialogs';
import { PackBadges } from './PackBadges';
import { PackDetailDialog, type PackDetailActions } from './PackDetail';
import { StudioToast } from './StudioParts';
import { Swatches } from './Swatches';

const SERIF = 'Georgia, serif';
const SANS = 'system-ui, sans-serif';
const TOAST_MS = 5000;

type Dialog = { kind: 'rename' | 'delete'; pack: PackSummary } | { kind: 'conflict'; file: File; existing: PackSummary } | null;

function swatch(pack: PackSummary, name: string): string | undefined {
  return pack.swatches.find((item) => item.name === name)?.value;
}

function LibraryCard({ pack, onOpen }: { pack: PackSummary; onOpen: () => void }) {
  const display = fontStack(pack.fonts.display, SERIF);
  const body = fontStack(pack.fonts.body, SANS);
  return (
    <li>
      <button type="button" className="lib-card" aria-label={pack.name} onClick={onOpen}>
        <span className="lib-specimen" style={{ background: swatch(pack, 'bg'), color: swatch(pack, 'fg') }} aria-hidden="true">
          <span className="lib-aa" style={{ fontFamily: display }}>
            Aa
          </span>
          <span className="lib-chip" style={{ background: swatch(pack, 'primary') }} />
        </span>
        <span className="lib-text">
          <span className="lib-name truncate">{pack.name}</span>
          <span className="lib-fonts">
            <span style={{ fontFamily: display }}>{pack.fonts.display}</span>
            <span aria-hidden="true"> · </span>
            <span style={{ fontFamily: body }}>{pack.fonts.body}</span>
          </span>
          <Swatches swatches={pack.swatches} max={7} />
          <PackBadges pack={pack} tags={2} />
        </span>
      </button>
    </li>
  );
}

function Problems({ problems }: { problems: PackProblem[] }) {
  if (problems.length === 0) return null;
  const title = problems.length === 1 ? '1 design system could not load' : `${problems.length} design systems could not load`;
  return (
    <details className="lib-problems">
      <summary>{title}</summary>
      <ul>
        {problems.map((problem) => (
          <li key={`${problem.source}:${problem.id}`}>
            <code>{problem.id}</code> {problem.errors.join(' ')}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Group({ title, packs, onOpen, empty }: { title: string; packs: PackSummary[]; onOpen: (pack: PackSummary) => void; empty?: React.ReactNode }) {
  const id = `lib-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section className="lib-group" aria-labelledby={id}>
      <h2 id={id}>
        {title} <span className="lib-count">{packs.length}</span>
      </h2>
      {packs.length === 0 && empty ? (
        empty
      ) : (
        <ul className="lib-grid">
          {packs.map((pack) => (
            <LibraryCard key={pack.id} pack={pack} onOpen={() => onOpen(pack)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function useToast(): [string | null, (text: string) => void] {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  return [toast?.text ?? null, (text) => setToast({ id: Date.now(), text })];
}

function existingOf(error: unknown): PackSummary | null {
  if (!(error instanceof ApiError) || error.code !== 'pack_exists') return null;
  return ((error.data as { existing?: PackSummary } | undefined)?.existing as PackSummary | undefined) ?? null;
}

function leave(patch: Parameters<typeof uiStore.set>[0]): void {
  uiStore.set({ screen: 'home', libraryFrom: null, ...patch });
}

export function DesignSystems({ from }: { from: LibraryFrom | null }) {
  const { packs, error } = usePacks();
  const [problems, setProblems] = useState<PackProblem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, show] = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .packProblems()
      .then(setProblems)
      .catch(() => setProblems([]));
  }, [packs]);

  const yours = (packs ?? []).filter((pack) => pack.source === 'user');
  const builtin = (packs ?? []).filter((pack) => pack.source === 'builtin');
  const selected = packs?.find((pack) => pack.id === selectedId) ?? null;

  const back = () => (from ? leave({ activeProjectId: from.projectId }) : leave({}));

  const imported = (pack: PackSummary, replaced: boolean) => {
    refreshPacks();
    show(replaced ? `Replaced ${pack.name}.` : `Imported ${pack.name}.`);
    setSelectedId(pack.id);
  };

  const importFile = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const result = await api.importPack(file);
      imported(result.pack, result.replaced);
    } catch (err) {
      const existing = existingOf(err);
      if (existing) setDialog({ kind: 'conflict', file, existing });
      else setImportError(errorText(err));
    } finally {
      setImporting(false);
    }
  };

  const actions: PackDetailActions = {
    onRename: (pack) => setDialog({ kind: 'rename', pack }),
    onDelete: (pack) => setDialog({ kind: 'delete', pack }),
    onDuplicate: async (pack) => {
      const copy = await api.duplicatePack(pack.id);
      refreshPacks();
      show(`Made ${copy.name}.`);
      setSelectedId(copy.id);
    },
    onExport: async (pack) => downloadBlob(await api.exportPack(pack.id), `${pack.id}.zip`),
    onOpenEditor: async (pack) => {
      const { project } = await api.openPackEditor(pack.id);
      leave({ activeProjectId: project.id });
    },
    onUseInNew: (pack) => leave({ activeProjectId: null, lastPackId: pack.id }),
    onApply: from
      ? async (pack) => {
          await api.applyPack(from.projectId, from.directionId, pack.id);
          leave({ activeProjectId: from.projectId });
        }
      : null,
  };

  return (
    <div className="home lib">
      <header className="home-header">
        <button type="button" className="btn ghost small" onClick={back}>
          Back
        </button>
        <span className="brand">Design systems</span>
      </header>
      <main className="lib-main">
        <div className="lib-head">
          <div className="lib-titles">
            <h1>Design systems</h1>
            <p className="muted">Tokens, fonts and a DESIGN.md that projects build with. Open one to preview, check or edit it.</p>
          </div>
          <div className="lib-head-actions">
            <input
              ref={fileInput}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              tabIndex={-1}
              aria-label="Design system zip"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void importFile(file);
              }}
            />
            <button type="button" className="btn" disabled={importing} onClick={() => fileInput.current?.click()}>
              {importing ? 'Importing…' : 'Import…'}
            </button>
            <button type="button" className="btn primary has-icon" onClick={() => uiStore.set({ screen: 'new-design-system', returnTo: 'design-systems' })}>
              <Icon name="plus" size={14} />
              New design system
            </button>
          </div>
        </div>
        {importError && (
          <div className="alert error small" role="alert">
            Could not import. {importError}
          </div>
        )}
        {error && <div className="alert error small">Could not load design systems. {error}</div>}
        <Problems problems={problems} />
        {packs === null ? (
          <div className="lib-grid skeleton" aria-hidden="true" />
        ) : (
          <>
            <Group
              title="Yours"
              packs={yours}
              onOpen={(pack) => setSelectedId(pack.id)}
              empty={
                <div className="lib-empty">
                  <span>Make one from a website, a DESIGN.md or a tokens file.</span>
                  <button type="button" className="btn small has-icon" onClick={() => uiStore.set({ screen: 'new-design-system', returnTo: 'design-systems' })}>
                    <Icon name="plus" size={14} />
                    New design system
                  </button>
                </div>
              }
            />
            <Group title="Built-in" packs={builtin} onOpen={(pack) => setSelectedId(pack.id)} />
          </>
        )}
      </main>
      {selected && !dialog && <PackDetailDialog key={selected.id} pack={selected} actions={actions} onClose={() => setSelectedId(null)} />}
      {dialog?.kind === 'rename' && (
        <RenamePackDialog
          pack={dialog.pack}
          onClose={() => setDialog(null)}
          onRename={async (name) => {
            await api.renamePack(dialog.pack.id, name);
            refreshPacks();
            show(`Renamed to ${name}.`);
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeletePackDialog
          pack={dialog.pack}
          onClose={() => setDialog(null)}
          onDelete={async () => {
            await api.deletePack(dialog.pack.id);
            setSelectedId(null);
            refreshPacks();
            show(`Deleted ${dialog.pack.name}.`);
          }}
        />
      )}
      {dialog?.kind === 'conflict' && (
        <ImportConflictDialog
          existing={dialog.existing}
          onClose={() => setDialog(null)}
          onChoose={async (mode) => {
            const result = await api.importPack(dialog.file, mode);
            imported(result.pack, result.replaced);
          }}
        />
      )}
      <StudioToast text={toast} />
    </div>
  );
}
