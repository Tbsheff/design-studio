import { lazy, Suspense, useCallback, useRef, useState } from "react";

import type { PackSummary } from "@design-studio/actions/_core/contracts";
import { Icon } from "../../kit/Icon.js";
import { usePopover } from "../../kit/use-popover.js";
import { Swatches } from "../inspector/swatches.js";
import { COPY } from "./copy.js";
import { findPack, keySwatches } from "./packs.js";
import type { PacksState } from "./packs.js";

const loadList = () => import("./pack-list.js");

const PackList = lazy(async () => {
  const loaded = await loadList();

  return { default: loaded.PackList };
});

interface Props {
  state: PacksState;
  value: string | null;
  onChange: (packId: string | null) => void;
  onNew?: () => void;
}

const TriggerLabel = ({ pack }: { pack: PackSummary | null }) => {
  if (!pack) {
    return (
      <>
        <Icon name="palette" size={14} />
        <span className="pack-trigger-text">Style</span>
      </>
    );
  }

  return (
    <>
      <Swatches swatches={keySwatches(pack)} max={3} size="sm" />
      <span className="pack-trigger-text truncate">{pack.name}</span>
    </>
  );
};

export const PackPicker = ({ state, value, onChange, onNew }: Props) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = findPack(state.packs, value);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);

  const choose = (pack: PackSummary | null) => {
    onChange(pack?.id ?? null);
    close(true);
  };

  return (
    <div className="pack-picker" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`btn ghost small pack-trigger ${selected ? "chosen" : ""}`}
        aria-label={COPY.labelDesignSystem}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-tip={
          selected ? `Design system: ${selected.name}` : "Design system"
        }
        onPointerEnter={() => void loadList()}
        onFocus={() => void loadList()}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <TriggerLabel pack={selected} />
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div className="pack-popover" role="presentation">
          <div className="pack-popover-head">
            <strong>Design system</strong>
            <span>
              Tokens, fonts and a DESIGN.md go into the project. The agent
              builds with them.
            </span>
          </div>
          {state.error && (
            <div className="alert error small">
              Could not load design systems. {state.error}
            </div>
          )}
          <Suspense fallback={null}>
            <PackList
              packs={state.packs}
              value={value}
              includeNone
              onChoose={choose}
              onTab={() => setOpen(false)}
            />
          </Suspense>
          {onNew && (
            <div className="pack-popover-foot">
              <button
                type="button"
                className="btn ghost small has-icon"
                onClick={onNew}
              >
                <Icon name="plus" size={14} />
                New design system…
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
