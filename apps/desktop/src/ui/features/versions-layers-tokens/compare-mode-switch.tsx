import { useCallback, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { ModeButton } from "./compare-mode-button.js";
import { MODES, toKeyStep } from "./compare-mode-model.js";
import type { Mode } from "./compare-mode-model.js";
import { COPY } from "./copy.js";

interface ModeSwitchProps {
  readonly mode: Mode;
  readonly onMode: (mode: Mode) => void;
}

const ModeSwitch = ({ mode, onMode }: ModeSwitchProps): ReactNode => {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      const delta = toKeyStep(event.key);

      if (delta === 0) {
        return;
      }

      event.preventDefault();

      const index =
        (MODES.findIndex((item) => item.id === mode) + delta + MODES.length) %
        MODES.length;

      const next = MODES[index];

      if (!next) {
        return;
      }

      onMode(next.id);

      buttonsRef.current[index]?.focus();
    },
    [mode, onMode]
  );

  const handleRef = useCallback(
    (index: number, node: HTMLButtonElement | null): void => {
      buttonsRef.current[index] = node;
    },
    []
  );

  return (
    <fieldset className="segmented compare-modes">
      <legend className="sr-only">{COPY.labelCompareMode}</legend>
      {MODES.map((item, index) => (
        <ModeButton
          key={item.id}
          index={index}
          isOn={mode === item.id}
          option={item}
          onKey={handleKeyDown}
          onMode={onMode}
          onRef={handleRef}
        />
      ))}
    </fieldset>
  );
};

export { ModeSwitch };
