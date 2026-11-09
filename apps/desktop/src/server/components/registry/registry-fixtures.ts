import type { RegistryItem } from "./engine/index.js";

const BADGE_CODE = `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
`;

const CALENDAR_CODE = `"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/registry/new-york/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        month_caption: "flex h-8 items-center justify-center text-sm font-medium",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "outline" }), "size-8 p-0"),
        button_next: cn(buttonVariants({ variant: "outline" }), "size-8 p-0"),
        month_grid: "w-full border-collapse",
        weekday: "w-8 text-xs font-normal text-muted-foreground",
        day: "size-8 p-0 text-center text-sm",
        day_button: cn(buttonVariants({ variant: "ghost" }), "size-8 p-0 font-normal"),
        selected: "bg-primary text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeft className="size-4" />
          }
          return <ChevronRight className="size-4" />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
`;

const FIXTURES: readonly RegistryItem[] = [
  {
    dependencies: ["@radix-ui/react-slot", "class-variance-authority"],
    devDependencies: [],
    files: [
      {
        content: BADGE_CODE,
        path: "registry/new-york/ui/badge.tsx",
        type: "registry:ui",
      },
    ],
    name: "badge",
    registryDependencies: [],
  },
  {
    dependencies: ["react-day-picker@9.8.0", "lucide-react"],
    devDependencies: [],
    files: [
      {
        content: CALENDAR_CODE,
        path: "registry/new-york/ui/calendar.tsx",
        type: "registry:ui",
      },
    ],
    name: "calendar",
    registryDependencies: ["button"],
  },
];

const getFixtureItem = (name: string): RegistryItem | null =>
  FIXTURES.find((item) => item.name === name) ?? null;

export { getFixtureItem };
