import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Same helper as the Stackdrop UI kit's lib/utils.ts.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
