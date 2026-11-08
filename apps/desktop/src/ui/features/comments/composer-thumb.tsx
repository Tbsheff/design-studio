import { useCallback } from "react";
import type { ReactElement } from "react";

import { toThumbClass, toThumbTip } from "./comment-composer-model.js";
import type { ImageChip } from "./comment-composer-model.js";
import { copy } from "./copy.js";
import { Icon } from "./deps.js";

const Thumb = ({
  image,
  onRemove,
}: {
  image: ImageChip;
  onRemove: (key: string) => void;
}): ReactElement => {
  const { key } = image;
  const removeSelf = useCallback((): void => onRemove(key), [key, onRemove]);

  return (
    <span
      className={toThumbClass(image)}
      data-tip={toThumbTip(image)}
      data-tip-side="top"
      data-testid="comment-image"
    >
      <img src={image.url} alt="" />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${copy.textRemove} ${image.name}`}
        onClick={removeSelf}
      >
        <Icon name="close" size={10} />
      </button>
    </span>
  );
};

export { Thumb };
