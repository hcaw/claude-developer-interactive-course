// Minimal inline markdown renderer.
//
// The course content uses exactly four inline forms (docs/wiki/course-content-inventory.md):
//   **bold**   `code`   *italic*   [link](url)
// That closed set is why there's no markdown library here — a single tokenizing pass covers it.
//
// Nesting is not supported and not needed; the parser never produces it.

import type { ReactNode } from "react";

const TOKEN = /(\*\*[^*]+?\*\*|`[^`]+?`|\*[^*\n]+?\*|\[[^\]]+?\]\([^)\s]+?\))/g;

export function InlineMd({ text }: { text: string }): ReactNode {
  const parts = text.split(TOKEN).filter((p) => p !== "" && p !== undefined);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="bg-secondary px-1.5 py-0.5 font-mono text-[0.9em] text-ink-2"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={i} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          const [, label, href] = link;
          const external = /^https?:\/\//.test(href);
          return (
            <a
              key={i}
              href={href}
              className="text-accent-text underline underline-offset-2 transition-colors hover:text-foreground"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {label}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
