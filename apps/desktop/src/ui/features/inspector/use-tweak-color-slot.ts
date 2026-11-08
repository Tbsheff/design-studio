import { createContext } from "react";
import type { ComponentType } from "react";

interface ColorSlotProps {
  readonly label: string;
  readonly value: string;
  readonly swatch: string;
  readonly onChange: (next: string) => void;
}

const TweakColorSlot = createContext<ComponentType<ColorSlotProps> | null>(
  null
);

export { TweakColorSlot };

export type { ColorSlotProps };
