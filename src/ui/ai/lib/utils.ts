// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
