import type { ReactElement } from "react";

import { AppThemeOption } from "./app-theme-option";
import { copy } from "./copy";
import type { ThemePref } from "./use-theme-pref";
import { useThemePref } from "./use-theme-pref";

const THEME_OPTIONS: readonly {
  readonly label: string;
  readonly pref: ThemePref;
}[] = [
  { label: copy.themeSystem, pref: "system" },
  { label: copy.themeLight, pref: "light" },
  { label: copy.themeDark, pref: "dark" },
];

const RADIOGROUP_ROLE = "radiogroup";

const AppThemeField = (): ReactElement => {
  const [current, setPref] = useThemePref();

  return (
    <section className="ship-settings" aria-label={copy.appearance}>
      <h3>{copy.appearance}</h3>
      <div
        className="segmented"
        role={RADIOGROUP_ROLE}
        aria-label={copy.appearance}
      >
        {THEME_OPTIONS.map((option) => (
          <AppThemeOption
            key={option.pref}
            isSelected={option.pref === current}
            label={option.label}
            onPick={setPref}
            pref={option.pref}
          />
        ))}
      </div>
    </section>
  );
};

export { AppThemeField };
