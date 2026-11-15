import { createContext } from "react";
import type { ReactElement } from "react";

interface ColorPickerSlotProps {
  readonly label: string;
  readonly swatch: string;
  readonly value: string;
  readonly onCommit: (value: string) => void;
  readonly onPreview: (value: string) => void;
  readonly onRevert: (base: string) => void;
}

type ColorPickerRender = (props: ColorPickerSlotProps) => ReactElement;

const ColorPickerSlot = createContext<ColorPickerRender | null>(null);

export { ColorPickerSlot };

export type { ColorPickerRender, ColorPickerSlotProps };
