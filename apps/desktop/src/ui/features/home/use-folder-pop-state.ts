import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { toNextFolderPop } from "./composer-pop-model.js";
import type { Pop } from "./home-model.js";

const useFolderPopState = (
  isFolderPopOpen: boolean
): [Pop, Dispatch<SetStateAction<Pop>>] => {
  const [pop, setPop] = useState<Pop>(() =>
    toNextFolderPop(null, isFolderPopOpen)
  );

  const [wasFolderPopOpen, setWasFolderPopOpen] = useState(isFolderPopOpen);

  if (wasFolderPopOpen !== isFolderPopOpen) {
    setWasFolderPopOpen(isFolderPopOpen);
    setPop((current) => toNextFolderPop(current, isFolderPopOpen));
  }

  return [pop, setPop];
};

export { useFolderPopState };
