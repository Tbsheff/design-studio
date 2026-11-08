import { useCallback } from "react";
import type { CSSProperties, MouseEvent, ReactElement, Ref } from "react";

import { copy } from "./copy.js";
import { SlashList } from "./slash-list.js";
import type { SlashMenuView } from "./slash-menu-model.js";

const SlashPanel = ({
  panel,
  placement,
  view,
}: {
  panel: Ref<HTMLDivElement>;
  placement: CSSProperties;
  view: SlashMenuView;
}): ReactElement => {
  const keepFocus = useCallback(
    (event: MouseEvent): void => event.preventDefault(),
    []
  );

  return (
    <div
      ref={panel}
      role="presentation"
      className="slash-menu"
      style={placement}
      data-testid="slash-menu"
      onMouseDown={keepFocus}
    >
      {view.heading && (
        <div className="slash-heading" aria-hidden="true">
          {view.heading}
          {view.lock && (
            <span className="slash-lock">
              {copy.text}
              {view.lock}
            </span>
          )}
        </div>
      )}
      <SlashList view={view} />
      {view.statuses.map((section) => (
        <div key={section.label} className="slash-status">
          <div className="slash-heading">{section.label}</div>
          <div className="slash-empty">{section.status}</div>
        </div>
      ))}
      {view.rows.length === 0 && view.statuses.length === 0 && (
        <div className="slash-empty">
          {copy.noResultsFor}
          {view.query}
        </div>
      )}
      {view.note && <div className="slash-note">{view.note}</div>}
    </div>
  );
};

export { SlashPanel };
