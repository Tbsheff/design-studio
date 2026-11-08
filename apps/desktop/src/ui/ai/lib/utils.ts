// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export { cn };
