import type {
  DesignSystemState,
  Project,
  CompiledTokenEntry,
} from "@design-studio/contracts";
import { Icon, useFitPopover, usePopover } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback, useRef, useState, useEffect } from "react";

import { api, errorText } from "../../api.js";
import { Swatches } from "../inspector/swatches.js";
import { COPY } from "./copy.js";
import { ChangePackDialog, SavePackDialog } from "./design-system-dialogs.js";
import type { DesignSystemActions } from "./design-system-model.js";
import { findPack, keySwatches, usePacks } from "./packs.js";

export type { DesignSystemActions } from "./design-system-model.js";

export interface DesignSystemRef {
  projectId: string;
  directionId: string | null;
  packId: string | null;
  name: string | null;
  backing: boolean;
}

export const designSystemRef = (
  projectId: string,
  directionId: string | null,
  project: Project,
  state: DesignSystemState | null
): DesignSystemRef => {
  const backing = Boolean(project.designSystemFor);

  if (!state) {
    return {
      backing,
      directionId,
      name: null,
      packId: project.packId ?? null,
      projectId,
    };
  }

  return {
    backing,
    directionId,
    name: state.manifest?.name ?? null,
    packId: state.packId,
    projectId,
  };
};

type Dialog = "change" | "save" | null;

interface ChipDialogsProps {
  dialog: Dialog;
  system: DesignSystemRef;
  name: string;
  userPack: boolean;
  actions: DesignSystemActions;
  onClose: () => void;
}

const ChipDialogs = ({
  dialog,
  system,
  name,
  userPack,
  actions,
  onClose,
}: ChipDialogsProps): ReactElement | null => {
  if (dialog === "change") {
    const from = system.directionId
      ? { directionId: system.directionId, projectId: system.projectId }
      : null;

    return (
      <ChangePackDialog
        currentId={system.packId}
        from={from}
        onClose={onClose}
        onApply={actions.onApply}
      />
    );
  }

  if (dialog === "save") {
    return (
      <SavePackDialog
        defaultName={name}
        updating={userPack}
        canCopy={userPack && !system.backing}
        onClose={onClose}
        onSave={(saveName, asNew) => actions.onSave(saveName, undefined, asNew)}
      />
    );
  }

  return null;
};

interface Load {
  state: DesignSystemState | null;
  error: string | null;
}

const ValueCell = ({
  value,
  color,
}: {
  value: string;
  color: boolean;
}): ReactElement => (
  <span className="ds-value" data-tip={value}>
    {color && (
      <span
        className="swatch"
        style={{ background: value }}
        aria-hidden="true"
      />
    )}
    <span className="truncate">{value}</span>
  </span>
);

const TokenRow = ({ entry }: { entry: CompiledTokenEntry }): ReactElement => {
  const color = entry.type === "color";

  return (
    <li className="ds-row">
      <code className="ds-var">{entry.cssVar}</code>
      <ValueCell value={entry.value} color={color} />
      {entry.darkValue ? (
        <ValueCell value={entry.darkValue} color={color} />
      ) : (
        <span className="ds-none">Same</span>
      )}
    </li>
  );
};

const TokenList = ({ load }: { load: Load }): ReactElement => {
  if (load.error) {
    return (
      <div className="alert error small" role="alert">
        Could not load tokens. {load.error} Close this panel and open it again.
      </div>
    );
  }

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
        <ul
          className="alert error small ds-errors"
          aria-label={COPY.labelDesignSystemErrors}
        >
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
      <ul className="ds-list" aria-label={COPY.labelTokens}>
        {entries.map((entry) => (
          <TokenRow key={entry.cssVar} entry={entry} />
        ))}
      </ul>
    </>
  );
};

const useDesignSystem = (ref: DesignSystemRef, open: boolean): Load => {
  const [load, setLoad] = useState<Load>({ error: null, state: null });
  const { projectId, directionId } = ref;
  useEffect(() => {
    if (!open || !directionId) {
      return;
    }

    let live = true;

    const read = async (): Promise<void> => {
      try {
        const state = await api.getDesignSystem(projectId, directionId);

        if (live) {
          setLoad({ error: null, state });
        }
      } catch (error) {
        if (live) {
          setLoad((prev) => ({ error: errorText(error), state: prev.state }));
        }
      }
    };

    void read();

    return (): void => {
      live = false;
    };
  }, [open, projectId, directionId]);

  return load;
};

export const DesignSystemChip = ({
  system,
  actions,
  onOpenDesignMd,
}: {
  system: DesignSystemRef;
  actions: DesignSystemActions;
  onOpenDesignMd: () => void;
}): ReactElement | null => {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const { packs } = usePacks();
  const load = useDesignSystem(system, open);
  const pack = findPack(packs, system.packId);

  const name =
    system.name ??
    pack?.name ??
    load.state?.manifest?.name ??
    system.packId ??
    "";

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);
  useFitPopover(popover, trigger, open);

  const openDialog = (next: Dialog): void => {
    close(false);
    setDialog(next);
  };

  const dialogs = (
    <ChipDialogs
      dialog={dialog}
      system={system}
      name={name}
      userPack={pack?.source === "user"}
      actions={actions}
      onClose={() => setDialog(null)}
    />
  );

  if (!system.directionId) {
    return null;
  }

  if (!system.packId) {
    return (
      <>
        <button
          type="button"
          className="btn ghost small has-icon ds-add"
          onClick={() => setDialog("change")}
        >
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
        <div
          ref={popover}
          className="ds-popover"
          role="dialog"
          aria-label={COPY.labelDesignSystem}
        >
          <div className="ds-head">
            <div className="ds-titles">
              <strong>{name}</strong>
              {pack && <span>{pack.description}</span>}
            </div>
            <span className="badge">
              {pack?.source === "user" ? "Yours" : "Read-only"}
            </span>
          </div>
          <div className="ds-actions">
            <button
              type="button"
              className="btn small"
              onClick={() => openDialog("change")}
            >
              Change design system…
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => openDialog("save")}
            >
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
};
