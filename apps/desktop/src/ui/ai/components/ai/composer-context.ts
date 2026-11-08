import { createContext, useContext } from "react";

interface ComposerContextValue {
  readonly setEmpty: (isEmpty: boolean) => void;
  readonly setFocused: (isFocused: boolean) => void;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

const useComposerContext = (): ComposerContextValue => {
  const context = useContext(ComposerContext);

  if (!context) {
    throw new Error("Composer parts must be used inside <Composer>");
  }

  return context;
};

export { ComposerContext, useComposerContext };
