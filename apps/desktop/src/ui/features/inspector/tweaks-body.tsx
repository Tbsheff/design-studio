import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { TweaksEmptyState } from "./tweaks-empty-state.js";
import { TweaksFooter } from "./tweaks-footer.js";
import type { toGroupControls } from "./tweaks-model.js";
import { TweaksProblems } from "./tweaks-problems.js";
import { TweaksSection } from "./tweaks-section.js";
import type { TweaksDraft } from "./use-tweaks.js";

const TweaksBody = ({
  draft,
  groups,
  isRunning,
  onSuggest,
}: {
  readonly draft: TweaksDraft;
  readonly groups: ReturnType<typeof toGroupControls>;
  readonly isRunning: boolean;
  readonly onSuggest: () => void;
}): ReactElement => {
  const { state, edit, revert } = draft;

  return (
    <>
      {state?.error && (
        <p className="twk-error" role="alert">
          <Icon name="alert" size={13} />
          {state.error}
        </p>
      )}
      {!state && draft.loadError && (
        <p className="twk-error" role="alert">
          <Icon name="alert" size={13} />
          {draft.loadError}
        </p>
      )}
      <div className="twk-scroll">
        {state && groups.length === 0 && (
          <TweaksEmptyState isRunning={isRunning} onSuggest={onSuggest} />
        )}
        {state && <TweaksProblems problems={state.problems} />}
        {groups.map((group) => (
          <TweaksSection
            key={group.label}
            group={group}
            values={draft.values}
            pending={draft.pending}
            onEdit={edit}
            onRevert={revert}
          />
        ))}
      </div>
      <TweaksFooter draft={draft} />
    </>
  );
};

export { TweaksBody };
