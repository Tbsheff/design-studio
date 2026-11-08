import type { ProjectKind } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { toKindTip, toNextKind } from "./composer-pop-model.js";
import { copy } from "./copy.js";

const KIND_ICON_SIZE = 16;

interface KindToggleProps {
  readonly kind: ProjectKind;
  readonly onKind: (kind: ProjectKind) => void;
}

const KindToggle = ({ kind, onKind }: KindToggleProps): ReactElement => {
  const toggle = useCallback((): void => {
    onKind(toNextKind(kind));
  }, [kind, onKind]);

  return (
    <button
      type="button"
      className="icon-btn bordered home-square home-kind"
      aria-pressed={kind === "react"}
      aria-label={copy.reactViteProject}
      data-tip={toKindTip(kind)}
      onClick={toggle}
    >
      <Icon name="code" size={KIND_ICON_SIZE} />
    </button>
  );
};

export { KindToggle };
