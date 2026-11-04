import { useEffect, useRef, useState, useTransition } from "react";

import type { PackProblem, PackSummary } from "@design-studio/actions/_core/contracts";
import { ApiError, errorText } from "../../api.js";
import { StudioToast } from "../../app/shell/studio-parts.js";
import { downloadBlob } from "../../domain/format.js";
import { Icon } from "../../kit/Icon.js";
import { packApi } from "../../platform/pack-api.js";
import { uiStore } from "../../platform/storage.js";
import type { LibraryFrom } from "../../platform/storage.js";
import { Swatches } from "../inspector/swatches.js";
import { COPY } from "./copy.js";
import {
  DeletePackDialog,
  ImportConflictDialog,
  RenamePackDialog,
} from "./library-dialogs.js";
import { PackBadges } from "./pack-badges.js";
import { PackDetailDialog } from "./pack-detail.js";
import type { PackDetailActions } from "./pack-detail.js";
import { refreshPacks, usePacks, fontStack } from "./packs.js";

type Dialog =
  | { kind: "rename" | "delete"; pack: PackSummary }
  | { kind: "conflict"; file: File; existing: PackSummary }
  | null;

const existingOf = (error: unknown): PackSummary | null => {
  if (!(error instanceof ApiError) || error.code !== "pack_exists") {
    return null;
  }

  return (
    ((error.data as { existing?: PackSummary } | undefined)?.existing as
      | PackSummary
      | undefined) ?? null
  );
};

const leave = (patch: Parameters<typeof uiStore.set>[0]): void => {
  uiStore.set({ libraryFrom: null, screen: "home", ...patch });
};

const Problems = ({ problems }: { problems: PackProblem[] }) => {
  if (problems.length === 0) {
    return null;
  }

  const title =
    problems.length === 1
      ? "1 design system could not load"
      : `${problems.length} design systems could not load`;

  return (
    <details className="lib-problems">
      <summary>{title}</summary>
      <ul>
        {problems.map((problem) => (
          <li key={`${problem.source}:${problem.id}`}>
            <code>{problem.id}</code> {problem.errors.join(" ")}
          </li>
        ))}
      </ul>
    </details>
  );
};

const SERIF = "Georgia, serif";

const SANS = "system-ui, sans-serif";

const swatch = (pack: PackSummary, name: string): string | undefined =>
  pack.swatches.find((item) => item.name === name)?.value;

const ModeSwatches = ({ pack }: { pack: PackSummary }) => {
  const light = pack.mode === "light" ? pack.swatches : null;

  const dark =
    pack.mode === "dark" ? pack.swatches : (pack.darkSwatches ?? null);

  return (
    <span className="lib-modes" data-testid="mode-swatches">
      {light && (
        <span className="lib-mode light" data-tip={COPY.tipLightModeColors}>
          <span className="sr-only">Light</span>
          <Swatches swatches={light} />
        </span>
      )}
      {dark && (
        <span className="lib-mode dark" data-tip={COPY.tipDarkModeColors}>
          <span className="sr-only">Dark</span>
          <Swatches swatches={dark} />
        </span>
      )}
    </span>
  );
};

const LibraryCard = ({
  pack,
  onOpen,
}: {
  pack: PackSummary;
  onOpen: () => void;
}) => {
  const display = fontStack(pack.fonts.display, SERIF);
  const body = fontStack(pack.fonts.body, SANS);

  return (
    <li>
      <button
        type="button"
        className="lib-card"
        aria-label={pack.name}
        onClick={onOpen}
      >
        <span
          className="lib-specimen"
          style={{ background: swatch(pack, "bg"), color: swatch(pack, "fg") }}
          aria-hidden="true"
        >
          <span className="lib-aa" style={{ fontFamily: display }}>
            Aa
          </span>
          <span
            className="lib-chip"
            style={{ background: swatch(pack, "primary") }}
          />
        </span>
        <span className="lib-text">
          <span className="lib-name truncate">{pack.name}</span>
          <span className="lib-fonts">
            <span style={{ fontFamily: display }}>{pack.fonts.display}</span>
            <span aria-hidden="true"> · </span>
            <span style={{ fontFamily: body }}>{pack.fonts.body}</span>
          </span>
          <ModeSwatches pack={pack} />
          <PackBadges pack={pack} tags={2} />
        </span>
      </button>
    </li>
  );
};

const Group = ({
  title,
  packs,
  onOpen,
  empty,
}: {
  title: string;
  packs: PackSummary[];
  onOpen: (pack: PackSummary) => void;
  empty?: React.ReactNode;
}) => {
  const id = `lib-${title.toLowerCase().replaceAll(/\W+/gu, "-")}`;

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
            <LibraryCard
              key={pack.id}
              pack={pack}
              onOpen={() => onOpen(pack)}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

const TOAST_MS = 5000;

const useToast = (): [string | null, (text: string) => void] => {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      TOAST_MS
    );

    return () => clearTimeout(timer);
  }, [toast]);

  return [toast?.text ?? null, (text) => setToast({ id: Date.now(), text })];
};

export const DesignSystems = ({ from }: { from: LibraryFrom | null }) => {
  const { packs, error } = usePacks();
  const [problems, setProblems] = useState<PackProblem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [importing, startImport] = useTransition();
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, show] = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;

    const read = async () => {
      let next: PackProblem[] = [];

      try {
        next = await packApi.packProblems();
      } catch {
        next = [];
      }

      if (live) {
        setProblems(next);
      }
    };

    void read();

    return () => {
      live = false;
    };
  }, [packs]);

  const yours = (packs ?? []).filter((pack) => pack.source === "user");
  const builtin = (packs ?? []).filter((pack) => pack.source === "builtin");
  const selected = packs?.find((pack) => pack.id === selectedId) ?? null;

  const back = () =>
    from ? leave({ activeProjectId: from.projectId }) : leave({});

  const imported = (pack: PackSummary, replaced: boolean) => {
    refreshPacks();
    show(replaced ? `Replaced ${pack.name}.` : `Imported ${pack.name}.`);
    setSelectedId(pack.id);
  };

  const importFile = (file: File) => {
    setImportError(null);
    startImport(async () => {
      try {
        const result = await packApi.importPack(file);
        imported(result.pack, result.replaced);
      } catch (failure) {
        const existing = existingOf(failure);

        if (existing) {
          setDialog({ existing, file, kind: "conflict" });
        } else {
          setImportError(errorText(failure));
        }
      }
    });
  };

  const actions: PackDetailActions = {
    onApply: from
      ? async (pack) => {
          await packApi.applyPack(from.projectId, from.directionId, pack.id);
          leave({ activeProjectId: from.projectId });
        }
      : null,
    onDelete: (pack) => setDialog({ kind: "delete", pack }),
    onDuplicate: async (pack) => {
      const copy = await packApi.duplicatePack(pack.id);
      refreshPacks();
      show(`Made ${copy.name}.`);
      setSelectedId(copy.id);
    },
    onExport: async (pack) =>
      downloadBlob(await packApi.exportPack(pack.id), `${pack.id}.zip`),
    onOpenEditor: async (pack) => {
      const { project } = await packApi.openPackEditor(pack.id);
      leave({ activeProjectId: project.id });
    },
    onRename: (pack) => setDialog({ kind: "rename", pack }),
    onUseInNew: (pack) => leave({ activeProjectId: null, lastPackId: pack.id }),
  };

  return (
    <div className="home lib">
      <header className="home-header">
        <button
          type="button"
          className="btn ghost small has-icon back-btn"
          onClick={back}
        >
          <Icon name="arrowLeft" size={14} />
          Back
        </button>
      </header>
      <main className="lib-main">
        <div className="lib-head">
          <div className="lib-titles">
            <h1>Design systems</h1>
            <p className="muted">
              Tokens, fonts and a DESIGN.md that projects build with. Open one
              to preview, check or edit it.
            </p>
          </div>
          <div className="lib-head-actions">
            <input
              ref={fileInput}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              tabIndex={-1}
              aria-label={COPY.labelDesignSystemZip}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";

                if (file) {
                  void importFile(file);
                }
              }}
            />
            <button
              type="button"
              className="btn"
              disabled={importing}
              onClick={() => fileInput.current?.click()}
            >
              {importing ? "Importing…" : "Import…"}
            </button>
            <button
              type="button"
              className="btn primary has-icon"
              onClick={() =>
                uiStore.set({
                  returnTo: "design-systems",
                  screen: "new-design-system",
                })
              }
            >
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
        {error && (
          <div className="alert error small">
            Could not load design systems. {error}
          </div>
        )}
        <Problems problems={problems} />
        {packs === null ? (
          <div className="lib-grid skeleton" aria-hidden="true" />
        ) : (
          <>
            <Group
              title={COPY.titleYours}
              packs={yours}
              onOpen={(pack) => setSelectedId(pack.id)}
              empty={
                <div className="lib-empty">
                  <span>
                    Make one from a website, a DESIGN.md or a tokens file.
                  </span>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() =>
                      uiStore.set({
                        returnTo: "design-systems",
                        screen: "new-design-system",
                      })
                    }
                  >
                    Make your first
                  </button>
                </div>
              }
            />
            <Group
              title={COPY.titleBuiltIn}
              packs={builtin}
              onOpen={(pack) => setSelectedId(pack.id)}
            />
          </>
        )}
      </main>
      {selected && !dialog && (
        <PackDetailDialog
          key={selected.id}
          pack={selected}
          actions={actions}
          onClose={() => setSelectedId(null)}
        />
      )}
      {dialog?.kind === "rename" && (
        <RenamePackDialog
          pack={dialog.pack}
          onClose={() => setDialog(null)}
          onRename={async (name) => {
            await packApi.renamePack(dialog.pack.id, name);
            refreshPacks();
            show(`Renamed to ${name}.`);
          }}
        />
      )}
      {dialog?.kind === "delete" && (
        <DeletePackDialog
          pack={dialog.pack}
          onClose={() => setDialog(null)}
          onDelete={async () => {
            await packApi.deletePack(dialog.pack.id);
            setSelectedId(null);
            refreshPacks();
            show(`Deleted ${dialog.pack.name}.`);
          }}
        />
      )}
      {dialog?.kind === "conflict" && (
        <ImportConflictDialog
          existing={dialog.existing}
          onClose={() => setDialog(null)}
          onChoose={async (mode) => {
            const result = await packApi.importPack(dialog.file, mode);
            imported(result.pack, result.replaced);
          }}
        />
      )}
      <StudioToast text={toast} />
    </div>
  );
};
