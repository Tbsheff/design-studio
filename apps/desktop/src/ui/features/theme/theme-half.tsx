import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toLook } from "./theme-model.js";
import type { ThemeItem, ThemeMode } from "./theme-model.js";

import styles from "./theme.module.css";

interface ThemeHalfProps {
  readonly item: ThemeItem;
  readonly mode: ThemeMode;
}

const ThemeHalf = ({ item, mode }: ThemeHalfProps): ReactElement => {
  const look = useMemo(() => toLook(item, mode), [item, mode]);

  const frame = useMemo(
    () => ({ background: look.bg, color: look.fg }),
    [look.bg, look.fg]
  );

  const sample = useMemo(
    () => ({ fontFamily: look.font ?? "inherit" }),
    [look.font]
  );

  const surface = useMemo(() => ({ background: look.surface }), [look.surface]);

  const primary = useMemo(() => ({ background: look.primary }), [look.primary]);

  const accent = useMemo(() => ({ background: look.accent }), [look.accent]);

  return (
    <span className={styles.half} data-mode={mode} style={frame}>
      <span className={styles.sample} style={sample}>
        {copy.sample}
      </span>
      <span aria-hidden="true" className={styles.chip} style={surface} />
      <span aria-hidden="true" className={styles.chip} style={primary} />
      <span aria-hidden="true" className={styles.chip} style={accent} />
    </span>
  );
};

export { ThemeHalf };
