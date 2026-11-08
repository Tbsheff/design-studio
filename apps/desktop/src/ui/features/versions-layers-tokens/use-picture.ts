import { useCallback, useState } from "react";

interface Picture {
  readonly name: string;
  readonly url: string;
}

interface PictureApi {
  readonly picture: Picture | null;
  readonly setPicture: (file: File | null) => void;
}

let lastPicture: Picture | null = null;

const usePicture = (): PictureApi => {
  const [picture, setPicture] = useState<Picture | null>(lastPicture);

  const selectPicture = useCallback((file: File | null): void => {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    if (lastPicture) {
      URL.revokeObjectURL(lastPicture.url);
    }

    lastPicture = { name: file.name, url: URL.createObjectURL(file) };
    setPicture(lastPicture);
  }, []);

  return { picture, setPicture: selectPicture };
};

export { usePicture };

export type { Picture };
