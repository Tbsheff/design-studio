// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from "../../lib/utils";

type MessageProps = React.ComponentProps<"div"> & {
  type?: "incoming" | "outgoing";
};

const Message = ({
  type = "outgoing",
  className,
  ...props
}: MessageProps): React.JSX.Element => 
  (
    <div
      data-slot="message"
      data-type={type}
      className={cn(
        "group/message flex w-full gap-3",
        "data-[type=outgoing]:flex-row-reverse",
        className,
      )}
      {...props}
    />
  )
;

const MessageAvatar = ({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="message-avatar"
      className={cn(
        "relative flex size-9.5 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground",
        "[&>img]:size-full [&>img]:object-cover",
        className,
      )}
      {...props}
    />
  )
;

const MessageContent = ({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="message-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1.5",
        "group-data-[type=outgoing]/message:items-end",
        className,
      )}
      {...props}
    />
  )
;

const messageTextVariants = cva("min-w-0 text-sm/6.5", {
  defaultVariants: { variant: "plain" },
  variants: {
    variant: {
      bubble:
        "w-fit max-w-[75%] rounded-outer bg-surface-elevated px-3 py-2 ring ring-border",
      plain:
        "[[data-slot=message-avatar]+[data-slot=message-content]>&:first-child]:pt-2",
    },
  },
});

type MessageTextProps = React.ComponentProps<"div"> &
  VariantProps<typeof messageTextVariants>;

const MessageText = ({
  variant,
  className,
  ...props
}: MessageTextProps): React.JSX.Element => 
  (
    <div
      data-slot="message-text"
      data-variant={variant ?? "plain"}
      className={cn(messageTextVariants({ className, variant }))}
      {...props}
    />
  )
;

const MessageAction = ({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="message-action"
      className={cn(
        "flex items-center gap-0.5",
        "[[data-slot=message-text][data-variant=plain]~&]:-mx-2",
        className,
      )}
      {...props}
    />
  )
;

export { Message, MessageAction, MessageAvatar, MessageContent, MessageText, messageTextVariants };
