import { BRIDGE_SCRIPT_PATH } from "@design-studio/contracts";
import { FRAME_STATE_ATTR } from "@design-studio/contracts/frame-state";
import type { FrameStateDef } from "@design-studio/contracts/frame-state";

type TagValue = string | number | boolean;

const toEscaped = (value: TagValue): string =>
  String(value).replaceAll(
    /[&<>"']/gu,
    (char) => `&#${String(char.codePointAt(0))};`
  );

const toHtml = (parts: TemplateStringsArray, ...values: TagValue[]): string => {
  let out = "";

  for (const [at, part] of parts.entries()) {
    out += part;

    if (at < values.length) {
      out += toEscaped(values[at] ?? "");
    }
  }

  return out;
};

const html = toHtml;

const toClockTag = (def: FrameStateDef | null): string => {
  const startMs = Date.parse(def?.clock ?? "");

  if (Number.isNaN(startMs)) {
    return "";
  }

  const isFrozen = def?.isClockFrozen === true;

  return html`<script data-studio-clock>
    (function () {
      var R = Date,
        B = ${startMs},
        F = ${isFrozen},
        S = R.now();
      var N = function () {
        return F ? B : B + (R.now() - S);
      };
      window.Date = new Proxy(R, {
        apply: function () {
          return new R(N()).toString();
        },
        construct: function (t, a, n) {
          return Reflect.construct(t, a.length === 0 ? [N()] : a, n);
        },
        get: function (t, k) {
          return k === "now" ? N : Reflect.get(t, k, t);
        },
      });
    })();
  </script>`;
};

const toBridgeTag = (stateId: string | null): string => {
  if (stateId === null) {
    return html`<script
      src="${BRIDGE_SCRIPT_PATH}"
      data-studio-app="next"
    ></script>`;
  }

  return html`<script
    src="${BRIDGE_SCRIPT_PATH}"
    data-studio-app="next"
    ${FRAME_STATE_ATTR}="${stateId}"
  ></script>`;
};

const toHeadTags = (def: FrameStateDef | null): string =>
  toClockTag(def) + toBridgeTag(def?.id ?? null);

export { toClockTag, toHeadTags };
