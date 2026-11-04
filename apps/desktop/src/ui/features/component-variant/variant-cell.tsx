import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { VariantOption } from "./deps.js";
import { PreviewFrame } from "./preview-frame.js";
import { usePreviewImage } from "./use-preview-image.js";
import type { PreviewIds } from "./use-preview-image.js";

import styles from "./component-variant.module.css";

interface VariantCellProps {
  readonly file: string;
  readonly ids: PreviewIds;
  readonly isDefault: boolean;
  readonly isPicked: boolean;
  readonly name: string;
  readonly onPick: (value: string) => void;
  readonly option: VariantOption;
  readonly prop: string;
}

const CELL_DELAY_MS = 0;

const VariantCell = (props: VariantCellProps): ReactElement => {
  const { ids, onPick, option, prop } = props;

  const query = useMemo(
    () => ({
      className: null,
      file: props.file,
      key: prop,
      name: props.name,
      value: option.value,
    }),
    [props.file, props.name, option.value, prop]
  );

  const image = usePreviewImage(ids, query, CELL_DELAY_MS);

  const handlePickValue = useCallback((): void => {
    onPick(option.value);
  }, [onPick, option.value]);

  return (
    <button
      type="button"
      className={styles.cell}
      aria-pressed={props.isPicked}
      data-tip={option.classes}
      onClick={handlePickValue}
    >
      <PreviewFrame image={image} label={option.value} />
      <span className={styles.cellName}>
        <span>{option.value}</span>
        {props.isDefault && (
          <span className={styles.mark}>{copy.defaultMark}</span>
        )}
      </span>
    </button>
  );
};

export { VariantCell };
