import { useCallback, useId, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ThemeStripBody } from "./theme-strip-body.js";
import { ThemeStripToggle } from "./theme-strip-toggle.js";
import { useThemeStrip } from "./use-theme-strip.js";
import type { ThemeStripSetup } from "./use-theme-strip.js";

import styles from "./theme.module.css";

const ThemeStrip = (setup: ThemeStripSetup): ReactElement => {
  const strip = useThemeStrip(setup);
  const bodyId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  return (
    <section aria-label={copy.title} className={styles.strip}>
      <ThemeStripToggle
        bodyId={bodyId}
        count={strip.items.length}
        isOpen={isOpen}
        onToggle={handleToggle}
      />
      <ThemeStripBody
        bodyId={bodyId}
        isOpen={isOpen}
        setup={setup}
        strip={strip}
      />
    </section>
  );
};

export { ThemeStrip };
