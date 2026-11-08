import { createElement } from "react";
import type { ComponentType, ReactElement } from "react";

interface ClassProps {
  readonly className?: string | undefined;
}

const toStyled = <Props extends ClassProps>(
  Base: ComponentType<Props>,
  className: string
): ComponentType<Omit<Props, "className">> => {
  const styled = (props: Omit<Props, "className">): ReactElement =>
    createElement(Base, { ...props, className } as Props);

  styled.displayName = `Styled(${Base.displayName ?? Base.name})`;

  return styled;
};

interface VariantProps {
  readonly "data-variant": string;
}

const toStyledByKey = <Props extends ClassProps>(
  Base: ComponentType<Props>,
  classes: ReadonlyMap<string, string>
): ComponentType<Omit<Props, "className"> & VariantProps> => {
  const built = new Map(
    [...classes].map(([key, className]) => [key, toStyled(Base, className)])
  );

  const fallback = toStyled(Base, "");

  const variant = (
    props: Omit<Props, "className"> & VariantProps
  ): ReactElement =>
    createElement(built.get(props["data-variant"]) ?? fallback, props);

  variant.displayName = `Variant(${Base.displayName ?? Base.name})`;

  return variant;
};

export { toStyled, toStyledByKey };
