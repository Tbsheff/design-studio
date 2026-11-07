import { useRef } from "react";
import type { KeyboardEvent } from "react";

import { copy } from "./copy.js";
import { TABS } from "./inspector-model.js";
import type { InspectorTab } from "./inspector-model.js";

const TabBar = ({
  tab,
  onTab,
}: {
  readonly tab: InspectorTab;
  readonly onTab: (tab: InspectorTab) => void;
}) => {
  const refs = useRef<Partial<Record<InspectorTab, HTMLButtonElement | null>>>(
    {}
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const at = TABS.findIndex((t) => t.id === tab);

    const target = {
      ArrowLeft: at - 1,
      ArrowRight: at + 1,
      End: TABS.length - 1,
      Home: 0,
    }[event.key];

    if (target === undefined) {
      return;
    }

    event.preventDefault();
    const next = TABS[(target + TABS.length) % TABS.length]?.id ?? "simple";
    onTab(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      className="edit-tabs"
      role="tablist"
      aria-label={copy.editMode}
      onKeyDown={onKeyDown}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          type="button"
          role="tab"
          id={`edit-tab-${t.id}`}
          aria-selected={tab === t.id}
          aria-controls={`edit-pane-${t.id}`}
          tabIndex={tab === t.id ? 0 : -1}
          className={`edit-tab ${tab === t.id ? "on" : ""}`}
          onClick={() => onTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export { TabBar };
