import { useCallback, useMemo, useRef } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { PopState } from "./composer-pop-model.js";
import type { Pop } from "./home-model.js";

interface PopRefs {
  readonly plus: RefObject<HTMLButtonElement | null>;
  readonly pack: RefObject<HTMLButtonElement | null>;
  readonly model: RefObject<HTMLButtonElement | null>;
  readonly level: RefObject<HTMLButtonElement | null>;
  readonly drafts: RefObject<HTMLButtonElement | null>;
  readonly folder: RefObject<HTMLButtonElement | null>;
}

interface ComposerPops {
  readonly refs: PopRefs;
  readonly state: PopState;
  readonly closeFolder: (shouldRefocus: boolean) => void;
  readonly openPack: () => void;
}

interface ComposerPopsDeps {
  readonly pop: Pop;
  readonly setPop: Dispatch<SetStateAction<Pop>>;
  readonly shown: Pop;
  readonly isClosing: boolean;
  readonly onFolderClose: () => void;
}

const useComposerPops = ({
  pop,
  setPop,
  shown,
  isClosing,
  onFolderClose,
}: ComposerPopsDeps): ComposerPops => {
  const plus = useRef<HTMLButtonElement>(null);
  const pack = useRef<HTMLButtonElement>(null);
  const model = useRef<HTMLButtonElement>(null);
  const level = useRef<HTMLButtonElement>(null);
  const drafts = useRef<HTMLButtonElement>(null);
  const folder = plus;

  const refs = useMemo(
    () => ({ drafts, folder, level, model, pack, plus }),
    [drafts, folder, level, model, pack, plus]
  );

  const close = useCallback(
    (shouldRefocus: boolean): void => {
      const trigger = refs[pop ?? "model"];

      setPop(null);

      if (shouldRefocus) {
        trigger.current?.focus();
      }
    },
    [pop, refs, setPop]
  );

  const toggle = useCallback(
    (next: Exclude<Pop, null>): void => {
      setPop((current) => {
        if (current === next) {
          return null;
        }

        return next;
      });
    },
    [setPop]
  );

  const closeFolder = useCallback(
    (shouldRefocus: boolean): void => {
      close(shouldRefocus);
      onFolderClose();
    },
    [close, onFolderClose]
  );

  const openPack = useCallback((): void => {
    setPop("pack");
  }, [setPop]);

  const state = useMemo(
    () => ({ close, isClosing, pop, shown, toggle }),
    [close, isClosing, pop, shown, toggle]
  );

  return { closeFolder, openPack, refs, state };
};

export { useComposerPops };

export type { ComposerPops, PopRefs };
