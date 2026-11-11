import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { useStyleReferenceThumb } from "./use-style-references.js";
import type { StyleReferencePin } from "./use-style-references.js";

interface StyleReferenceRowProps {
  readonly isPending: boolean;
  readonly onUnpin: (frameId: string) => void;
  readonly pin: StyleReferencePin;
  readonly projectId: string;
}

const StyleReferenceRow = ({
  isPending,
  onUnpin,
  pin,
  projectId,
}: StyleReferenceRowProps): ReactElement => {
  const thumb = useStyleReferenceThumb(projectId, pin.screenshotPath);
  const { id } = pin;

  const unpin = useCallback((): void => onUnpin(id), [id, onUnpin]);

  return (
    <li className="style-ref-row">
      <span className="style-ref-thumb">
        {thumb && <img src={thumb} alt="" width={48} height={32} />}
      </span>
      <span className="style-ref-text">
        <span className="style-ref-name">{pin.name}</span>
        {pin.sourcePath && (
          <span className="style-ref-path">{pin.sourcePath}</span>
        )}
      </span>
      <button
        type="button"
        className="icon-btn"
        aria-label={`${COPY.tipRemoveStyleReference}: ${pin.name}`}
        data-tip={COPY.tipRemoveStyleReference}
        data-tip-align="end"
        disabled={isPending}
        onClick={unpin}
      >
        <Icon name="close" size={14} />
      </button>
    </li>
  );
};

export { StyleReferenceRow };
