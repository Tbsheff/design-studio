import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";

import { ColorPickerSlot } from "../../domain/color-picker-slot.js";
import type { ColorPickerSlotProps } from "../../domain/color-picker-slot.js";
import { COPY } from "./copy.js";

interface ColorPickerInput {
  readonly label: string;
  readonly path: string | null;
  readonly swatch: string;
  readonly toHeader: (text: string) => ReactNode;
  readonly value: string;
  readonly onChange: (next: string) => void;
}

const TokenCommitSlot = createContext<((path: string) => void) | null>(null);

const VAR_ALIAS = /^var\(\s*(?<name>--[A-Za-z0-9_-]+)\s*\)$/u;

const PATH_ALIAS = /^\{(?<name>[A-Za-z0-9_.-]+)\}$/u;

const toAliasTarget = (value: string): string | null => {
  const text = value.trim();

  return (
    VAR_ALIAS.exec(text)?.groups?.["name"] ??
    PATH_ALIAS.exec(text)?.groups?.["name"] ??
    null
  );
};

const toAliasText = (
  linked: string | null,
  detachedFrom: string | null
): string | null => {
  if (detachedFrom !== null) {
    return `${COPY.aliasDetachedPrefix}${detachedFrom}`;
  }

  if (linked !== null) {
    return `${COPY.aliasLinkedPrefix}${linked}`;
  }

  return null;
};

const useColorPickerSlot = (input: ColorPickerInput): ReactElement | null => {
  const render = useContext(ColorPickerSlot);
  const commitDraft = useContext(TokenCommitSlot);
  const [detachedFrom, setDetachedFrom] = useState<string | null>(null);
  const { onChange, path, toHeader } = input;
  const linked = toAliasTarget(input.value);

  const handleCommit = useCallback(
    (next: string): void => {
      onChange(next);

      if (path !== null) {
        commitDraft?.(path);
      }
    },
    [onChange, commitDraft, path]
  );

  const handlePreview = useCallback(
    (next: string): void => {
      if (linked !== null) {
        setDetachedFrom(linked);
      }

      onChange(next);
    },
    [linked, onChange]
  );

  const handleRevert = useCallback(
    (base: string): void => {
      setDetachedFrom(null);
      onChange(base);
    },
    [onChange]
  );

  const header = useMemo((): ReactNode => {
    const text = toAliasText(linked, detachedFrom);

    if (text === null) {
      return null;
    }

    return toHeader(text);
  }, [linked, detachedFrom, toHeader]);

  const props = useMemo(
    (): ColorPickerSlotProps => ({
      header,
      label: input.label,
      onCommit: handleCommit,
      onPreview: handlePreview,
      onRevert: handleRevert,
      swatch: input.swatch,
      value: input.value,
    }),
    [
      header,
      input.label,
      handleCommit,
      handlePreview,
      handleRevert,
      input.swatch,
      input.value,
    ]
  );

  if (!render) {
    return null;
  }

  return render(props);
};

export { TokenCommitSlot, useColorPickerSlot };
