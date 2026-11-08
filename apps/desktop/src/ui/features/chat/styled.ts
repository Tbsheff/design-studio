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

export { toStyled };
