import type { ReactElement } from "react";

import { AccessibilityTextField } from "./accessibility-text-field.js";
import { copy } from "./copy.js";
import { DecorativeCheck } from "./decorative-check.js";
import type { AccessibilityHandlers } from "./use-accessibility-handlers.js";

interface AltFieldsProps {
  readonly alt: string | null;
  readonly disabled: boolean;
  readonly handlers: AccessibilityHandlers;
}

const AltFields = ({
  alt,
  disabled,
  handlers,
}: AltFieldsProps): ReactElement => (
  <>
    <AccessibilityTextField
      disabled={disabled || alt === ""}
      id="accessibility-alt"
      inputMode="text"
      label={copy.alt}
      tip={copy.altTip}
      value={alt ?? ""}
      onCommit={handlers.handleAlt}
    />
    <DecorativeCheck
      disabled={disabled}
      isDecorative={alt === ""}
      onToggle={handlers.handleDecorative}
    />
  </>
);

export { AltFields };

export type { AltFieldsProps };
