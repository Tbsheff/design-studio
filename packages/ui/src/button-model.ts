import { pick } from "./pick.js";

type ButtonVariant = "danger" | "ghost" | "icon" | "primary" | "secondary";

type ButtonSize = "md" | "sm";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  danger: "btn danger",
  ghost: "btn ghost",
  icon: "icon-btn",
  primary: "btn primary",
  secondary: "btn",
};

const toSizeClass = (variant: ButtonVariant, size: ButtonSize): string => {
  if (variant === "icon") {
    return pick(size === "md", " md", "");
  }

  return pick(size === "sm", " small", "");
};

const toButtonClass = (variant: ButtonVariant, size: ButtonSize): string =>
  `${VARIANT_CLASS[variant]}${toSizeClass(variant, size)}`;

const toButtonTip = (
  disabledReason: string | null,
  tip: string | null
): string | null => disabledReason ?? tip;

export { toButtonClass, toButtonTip };

export type { ButtonSize, ButtonVariant };
