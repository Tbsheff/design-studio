import type {
  LinkTransition,
  PrototypeLink,
} from "@design-studio/contracts/links";
import { UiSelect } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { LinkChange } from "./link-changes.js";
import { LinkTimingSelects } from "./link-timing-selects.js";
import { ProtoSlot } from "./proto-slot.js";
import { toMotionOptions } from "./prototype-model.js";

interface LinkMotionSelectsProps {
  readonly link: PrototypeLink;
  readonly onChange: (next: LinkChange) => void;
}

const LinkMotionSelects = ({
  link,
  onChange,
}: LinkMotionSelectsProps): ReactElement => {
  const options = toMotionOptions(link);

  const handleTransition = useCallback(
    (value: LinkTransition): void => onChange({ transition: value }),
    [onChange]
  );

  return (
    <>
      <ProtoSlot isNarrow={false}>
        <UiSelect
          aria-label={copy.transition}
          value={link.transition}
          options={options.transitions}
          onChange={handleTransition}
        />
      </ProtoSlot>
      {link.transition !== "instant" && (
        <LinkTimingSelects link={link} options={options} onChange={onChange} />
      )}
    </>
  );
};

export { LinkMotionSelects };
