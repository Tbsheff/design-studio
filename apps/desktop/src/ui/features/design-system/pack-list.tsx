import type { PackSummary } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { KeyboardEvent, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

import { Swatches } from "../inspector/swatches.js";
import { COPY } from "./copy.js";
import { findPack, fontStack, loadPackFonts } from "./packs.js";

const NONE = "none";
const SERIF = "Georgia, serif";
const SANS = "system-ui, sans-serif";

const columnsOf = (list: HTMLElement | null): number => {
  if (!list) {
    return 1;
  }

  return Math.max(
    1,
    getComputedStyle(list).gridTemplateColumns.split(" ").filter(Boolean).length
  );
};

const nextIndex = (
  key: string,
  index: number,
  count: number,
  cols: number
): number | null => {
  const moves: Record<string, number> = {
    ArrowDown: index + cols,
    ArrowLeft: index - 1,
    ArrowRight: index + 1,
    ArrowUp: index - cols,
    End: count - 1,
    Home: 0,
  };

  const target = moves[key];

  if (target === undefined) {
    return null;
  }

  return Math.min(count - 1, Math.max(0, target));
};

const NoneCard = (): ReactElement => (
  <>
    <span className="pack-specimen none" aria-hidden="true">
      <Icon name="close" size={14} />
    </span>
    <span className="pack-text">
      <span className="pack-name">{COPY.textNoDesignSystem}</span>
      <span className="pack-desc">{COPY.textTheAgentPicksColors}</span>
    </span>
  </>
);

const swatchValue = (pack: PackSummary, name: string): string | undefined =>
  pack.swatches.find((swatch) => swatch.name === name)?.value;

const PackCard = ({ pack }: { pack: PackSummary }): ReactElement => {
  const colors = {
    background: swatchValue(pack, "bg"),
    color: swatchValue(pack, "fg"),
  };

  return (
    <>
      <span className="pack-specimen" style={colors} aria-hidden="true">
        <span
          className="pack-aa"
          style={{ fontFamily: fontStack(pack.fonts.display, SERIF) }}
        >
          {COPY.textAa}
        </span>
        <span
          className="pack-line"
          style={{ fontFamily: fontStack(pack.fonts.body, SANS) }}
        >
          {COPY.textQuickBrownFox}
        </span>
      </span>
      <span className="pack-text" data-tip={pack.description}>
        <span className="pack-name">
          <span className="truncate">{pack.name}</span>
          {pack.source === "user" && (
            <span className="pack-yours">{COPY.titleYours}</span>
          )}
        </span>
        <span className="pack-desc">{pack.description}</span>
        <Swatches swatches={pack.swatches} max={7} />
      </span>
    </>
  );
};

interface ListProps {
  packs: PackSummary[] | null;
  value: string | null;
  includeNone: boolean;
  onChoose: (pack: PackSummary | null) => void;
  onTab?: () => void;
}

const PackList = ({
  packs,
  value,
  includeNone,
  onChoose,
  onTab,
}: ListProps): ReactElement => {
  const options: (PackSummary | null)[] = includeNone
    ? [null, ...(packs ?? [])]
    : (packs ?? []);

  const selected = findPack(packs, value);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const ready = packs !== null;

  const selectedIndex = options.findIndex(
    (pack) => (pack?.id ?? null) === (selected?.id ?? null)
  );

  useEffect(() => {
    if (ready) {
      setActive(Math.max(0, selectedIndex));
    }
  }, [ready]);

  useEffect(() => {
    if (packs) {
      loadPackFonts(packs);
    }
  }, [packs]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    list.current?.parentElement?.scrollIntoView({ block: "nearest" });
    cards.current[active]?.focus({ preventScroll: false });
  }, [active, ready]);

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (options.length > 0) {
        onChoose(options[active] ?? null);
      }

      return;
    }

    if (event.key === "Tab") {
      return onTab?.();
    }

    const next = nextIndex(
      event.key,
      active,
      options.length,
      columnsOf(list.current)
    );

    if (next === null) {
      return;
    }

    event.preventDefault();
    setActive(next);
  };

  return (
    <div
      ref={list}
      className="pack-list"
      role="listbox"
      aria-label={COPY.labelDesignSystems}
      onKeyDown={onKey}
    >
      {options.map((pack, index) => {
        const isSelected = (pack?.id ?? null) === (selected?.id ?? null);

        return (
          <div
            key={pack?.id ?? NONE}
            role="option"
            aria-label={pack?.name ?? "No design system"}
            aria-selected={isSelected}
            tabIndex={index === active ? 0 : -1}
            ref={(node) => {
              cards.current[index] = node;
            }}
            className={`pack-card ${isSelected ? "selected" : ""}`}
            onClick={() => onChoose(pack)}
            onMouseMove={() => index !== active && setActive(index)}
          >
            {pack ? <PackCard pack={pack} /> : <NoneCard />}
            {isSelected && (
              <span className="pack-check" aria-hidden="true">
                <Icon name="check" size={12} />
              </span>
            )}
          </div>
        );
      })}
      {packs === null && (
        <div className="pack-card skeleton" aria-hidden="true" />
      )}
    </div>
  );
};

export { PackList };
