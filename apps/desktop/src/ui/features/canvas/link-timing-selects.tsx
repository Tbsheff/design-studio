import {
  LINK_EASING_DEFAULT,
  linkDuration,
} from "@design-studio/contracts/links";
import type { LinkEasing, PrototypeLink } from "@design-studio/contracts/links";
import { UiSelect } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { LinkChange } from "./link-changes.js";
import { ProtoSlot } from "./proto-slot.js";
import type { MotionOptions } from "./prototype-model.js";

interface LinkTimingSelectsProps {
  readonly link: PrototypeLink;
  readonly options: MotionOptions;
  readonly onChange: (next: LinkChange) => void;
}

const LinkTimingSelects = ({
  link,
  options,
  onChange,
}: LinkTimingSelectsProps): ReactElement => {
  const handleDuration = useCallback(
    (value: string): void => onChange({ duration: Number(value) }),
    [onChange]
  );

  const handleEasing = useCallback(
    (value: LinkEasing): void => onChange({ easing: value }),
    [onChange]
  );

  return (
    <>
      <ProtoSlot isNarrow>
        <UiSelect
          aria-label={copy.duration}
          value={String(linkDuration(link))}
          options={options.durations}
          onChange={handleDuration}
        />
      </ProtoSlot>
      <ProtoSlot isNarrow>
        <UiSelect
          aria-label={copy.easing}
          value={link.easing ?? LINK_EASING_DEFAULT}
          options={options.easings}
          onChange={handleEasing}
        />
      </ProtoSlot>
    </>
  );
};

export { LinkTimingSelects };
