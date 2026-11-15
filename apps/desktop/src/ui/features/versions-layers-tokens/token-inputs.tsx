import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { colorHex } from "../../../shared/token-match.js";
import {
  isSwatchEmpty,
  toHexColor,
  toSwatchColor,
} from "../inspector/index.js";
import { TokenColorSwatch } from "./token-color-swatch.js";
import { TokenShortInput } from "./token-short-input.js";
import { useDraftText } from "./use-draft-text.js";

interface ColorValueProps {
  readonly invalid?: boolean;
  readonly label: string;
  readonly trail?: IconName;
  readonly onChange: (next: string) => void;
  readonly swatch: string;
  readonly value: string;
}

const TRAIL_ICON_SIZE = 12;

const ColorValue = ({
  invalid,
  label,
  onChange,
  swatch,
  trail,
  value,
}: ColorValueProps): ReactNode => {
  const draft = useDraftText(value, onChange);
  const { change } = draft;

  const handleEdit = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      change(event.target.value);
    },
    [change]
  );

  return (
    <div className="ins-field color tkp-field" data-tip={value}>
      <TokenColorSwatch
        fill={toSwatchColor(swatch)}
        hex={toHexColor(swatch) ?? colorHex(swatch)}
        isEmpty={isSwatchEmpty(swatch)}
        label={label}
        swatch={swatch}
        value={value}
        onChange={onChange}
      />
      <TokenShortInput
        inputClass="ins-input"
        draft={draft}
        isInvalid={Boolean(invalid)}
        label={label}
        value={value}
        onEdit={handleEdit}
      />
      {trail && (
        <span className="tkp-trail" aria-hidden="true">
          <Icon name={trail} size={TRAIL_ICON_SIZE} />
        </span>
      )}
    </div>
  );
};

export { ColorValue };
