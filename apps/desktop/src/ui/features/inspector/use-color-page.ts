import { summarizeHits } from "@design-studio/contracts/style-search";
import type {
  StyleQuery,
  TokenLookup,
} from "@design-studio/contracts/style-search";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";
import type { MutableRefObject } from "react";

import { tokenFieldState } from "../../../shared/token-match.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { toPageColors } from "./color-popup-model.js";
import type { PageColor } from "./color-popup-model.js";
import { getStyles } from "./use-style-scan.js";
import { useTokenUi } from "./use-token-snap.js";
import type { TokenUi } from "./use-token-snap.js";

type PortRef = MutableRefObject<PreviewPort | null>;

const COLOR_QUERY: StyleQuery = { property: "color" };

const ColorPageContext = createContext<PortRef | null>(null);

const toTokenVar = (
  ui: TokenUi,
  property: Parameters<TokenLookup>[0],
  value: string
): string | null => {
  const state = tokenFieldState(property, value, ui.entries, ui.mode);

  if (state.kind === "token") {
    return state.match.cssVar;
  }

  return null;
};

const toColorLookup = (ui: TokenUi | null): TokenLookup | null => {
  if (!ui || ui.entries.length === 0) {
    return null;
  }

  return (property, value) => toTokenVar(ui, property, value);
};

const useColorPage = (isOpen: boolean): PageColor[] => {
  const port = useContext(ColorPageContext);
  const ui = useTokenUi();
  const [colors, setColors] = useState<PageColor[]>([]);

  useEffect(() => {
    if (!isOpen || !port) {
      return;
    }

    let isLive = true;
    startTransition(async () => {
      const reply = await getStyles(port.current, COLOR_QUERY, false);

      if (isLive && reply) {
        const rows = summarizeHits(reply.result.hits, toColorLookup(ui));
        setColors(toPageColors(rows));
      }
    });

    return (): void => {
      isLive = false;
    };
  }, [isOpen, port, ui]);

  return colors;
};

export { ColorPageContext, useColorPage };
