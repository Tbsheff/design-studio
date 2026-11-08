// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { useRender } from "@base-ui/react/use-render";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils";

interface ConversationContextValue {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  setIsAtBottom: (value: boolean) => void;
  wasAtBottomRef: React.RefObject<boolean>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(
  null,
);

const useConversationContext = () => {
  const ctx = useContext(ConversationContext);

  if (!ctx) {
    throw new Error("Conversation parts must be used inside <Conversation>");
  }

  return ctx;
};

const useConversation = () => {
  const { isAtBottom, scrollToBottom, wasAtBottomRef, viewportRef } = useConversationContext();

  const stickToBottom = useCallback(() => {
    wasAtBottomRef.current = true;
    scrollToBottom("instant");
  }, [scrollToBottom, wasAtBottomRef]);

  return { isAtBottom, scrollToBottom, stickToBottom, viewportRef, wasAtBottomRef };
};

const Conversation = ({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): React.JSX.Element => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const v = viewportRef.current;

    if (!v) {return;}

    v.scrollTo({ behavior, top: v.scrollHeight });
  }, []);

  const element = useRender({
    defaultTagName: "div",
    props: {
      ...props,
      className: cn("relative overflow-hidden", className),
      "data-at-bottom": isAtBottom ? "true" : "false",
      "data-slot": "conversation",
    },
    render,
  });

  return (
    <ConversationContext.Provider
      value={{
        isAtBottom,
        scrollToBottom,
        setIsAtBottom,
        viewportRef,
        wasAtBottomRef,
      }}
    >
      {element}
    </ConversationContext.Provider>
  );
};

const ConversationContent = ({
  className,
  children,
  onScroll,
  render,
  ...props
}: useRender.ComponentProps<"div">): React.JSX.Element => {
  const { viewportRef, isAtBottom, setIsAtBottom, wasAtBottomRef } =
    useConversationContext();

  const contentRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const touchYRef = useRef<number | null>(null);

  const recompute = useCallback(() => {
    const v = viewportRef.current;

    if (!v) {return;}

    const distance = v.scrollHeight - v.scrollTop - v.clientHeight;
    const atBottom = distance < 24;

    if (atBottom) {wasAtBottomRef.current = true;}

    setIsAtBottom(atBottom);
  }, [viewportRef, setIsAtBottom, wasAtBottomRef]);

  useEffect(() => {
    const v = viewportRef.current;

    if (!v) {return;}

    v.scrollTop = v.scrollHeight;
    recompute();
  }, [recompute, viewportRef]);

  useEffect(() => {
    const c = contentRef.current;
    const v = viewportRef.current;

    if (!c || !v) {return;}

    const ro = new ResizeObserver(() => {
      if (wasAtBottomRef.current) {
        v.scrollTop = v.scrollHeight;
      }

      recompute();
    });

    ro.observe(c);
    ro.observe(v);

    return () => ro.disconnect();
  }, [recompute, viewportRef, wasAtBottomRef]);

  return useRender({
    defaultTagName: "div",
    props: {
      ...props,
      children: (
        <div ref={contentRef} className="flex flex-col gap-6">
          {children}
        </div>
      ),
      className: cn(
        "overflow-y-auto overscroll-contain size-full",
        className,
      ),
      "data-at-bottom": isAtBottom ? "true" : "false",
      "data-slot": "conversation-content",
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "PageUp" || event.key === "ArrowUp" || event.key === "Home" || (event.key === " " && event.shiftKey)) {wasAtBottomRef.current = false;}
      },
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) {return;}
        draggingRef.current = true;

        const release = () => {
          draggingRef.current = false;
          window.removeEventListener("pointerup", release);
          window.removeEventListener("pointercancel", release);
        };

        window.addEventListener("pointerup", release);
        window.addEventListener("pointercancel", release);
      },
      onScroll: (event: React.UIEvent<HTMLDivElement>) => {
        const v = event.currentTarget;

        if (draggingRef.current) {wasAtBottomRef.current = v.scrollHeight - v.scrollTop - v.clientHeight < 24;}
        recompute();
        onScroll?.(event);
      },
      onTouchMove: (event: React.TouchEvent<HTMLDivElement>) => {
        const y = event.touches[0]?.clientY;

        if (y !== undefined && touchYRef.current !== null && y > touchYRef.current + 2) {wasAtBottomRef.current = false;}
        touchYRef.current = y ?? null;
      },
      onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => {
        touchYRef.current = event.touches[0]?.clientY ?? null;
      },
      onWheel: (event: React.WheelEvent<HTMLDivElement>) => {
        if (event.deltaY < 0) {wasAtBottomRef.current = false;}
      },
    },
    ref: viewportRef,
    render,
  });
};

const ConversationScrollButton = ({
  render,
  onClick,
  ...props
}: useRender.ComponentProps<"button">): React.JSX.Element => {
  const { isAtBottom, scrollToBottom, wasAtBottomRef } = useConversationContext();

  return useRender({
    defaultTagName: "button",
    props: {
      ...props,
      "aria-label": "Jump to latest",
      "data-at-bottom": isAtBottom ? "true" : "false",
      "data-slot": "conversation-scroll-button",
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        wasAtBottomRef.current = true;
        scrollToBottom();
        onClick?.(event);
      },
      type: "button",
    },
    render,
  });
};

export { Conversation, ConversationContent, ConversationScrollButton, useConversation };
