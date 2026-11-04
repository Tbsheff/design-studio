import { Component } from "react";
import type { ReactNode } from "react";

import { errorText } from "../api";
import { BootError } from "./boot-error";
import { copy } from "./copy";

interface ScreenBoundaryProps {
  children: ReactNode;
}

interface ScreenBoundaryState {
  error: string | null;
}

class ScreenBoundary extends Component<
  ScreenBoundaryProps,
  ScreenBoundaryState
> {
  public static getDerivedStateFromError(error: Error): ScreenBoundaryState {
    return { error: errorText(error) };
  }

  public constructor(props: ScreenBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  public render(): ReactNode {
    const { error } = this.state;

    if (error === null) {
      return this.props.children;
    }

    return (
      <BootError
        actionLabel={copy.reload}
        message={error}
        title={copy.screenFailedTitle}
      />
    );
  }
}

export { ScreenBoundary };
