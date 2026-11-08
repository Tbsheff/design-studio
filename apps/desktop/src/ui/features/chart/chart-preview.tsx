import { useMemo } from "react";
import type { ReactElement } from "react";

import type { ChartDraft } from "./chart-model.js";
import type { MarkMode } from "./chart-preview-model.js";
import { HEIGHT, WIDTH, toPreviewMarks } from "./chart-preview-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartPreviewProps {
  readonly draft: ChartDraft;
}

const COLORS = [
  "var(--chart-preview-1)",
  "var(--chart-preview-2)",
  "var(--chart-preview-3)",
  "var(--chart-preview-4)",
  "var(--chart-preview-5)",
] as const;

const FILL_OPACITY = 0.22;

const toOpacity = (mode: MarkMode): number => {
  if (mode === "area") {
    return FILL_OPACITY;
  }

  return 1;
};

const ChartPreview = ({ draft }: ChartPreviewProps): ReactElement => {
  const marks = useMemo(() => toPreviewMarks(draft), [draft]);

  return (
    <svg
      aria-label={copy.previewLabel}
      className={styles.preview}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      {marks.map((mark) => {
        const color = COLORS[mark.colorIndex % COLORS.length] ?? COLORS[0];

        if (mark.mode === "stroke") {
          return (
            <path
              d={mark.path}
              fill="none"
              key={mark.id}
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          );
        }

        return (
          <path
            d={mark.path}
            fill={color}
            fillOpacity={toOpacity(mark.mode)}
            key={mark.id}
          />
        );
      })}
    </svg>
  );
};

export { ChartPreview };
