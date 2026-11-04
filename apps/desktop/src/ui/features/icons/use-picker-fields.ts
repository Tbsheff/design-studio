import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";

import { ICON_SIZE_DEFAULT } from "./deps.js";

type InputChange = (event: ChangeEvent<HTMLInputElement>) => void;

interface PickerFields {
  readonly active: number;
  readonly color: string;
  readonly handleColor: InputChange;
  readonly handleQuery: InputChange;
  readonly handleSize: InputChange;
  readonly query: string;
  readonly setActive: (index: number) => void;
  readonly size: string;
}

const usePickerFields = (): PickerFields => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [size, setSize] = useState(String(ICON_SIZE_DEFAULT));
  const [color, setColor] = useState("");

  const handleQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setActive(0);
  }, []);

  const handleSize = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSize(event.target.value);
  }, []);

  const handleColor = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setColor(event.target.value.trim());
  }, []);

  return {
    active,
    color,
    handleColor,
    handleQuery,
    handleSize,
    query,
    setActive,
    size,
  };
};

export { usePickerFields };

export type { PickerFields };
