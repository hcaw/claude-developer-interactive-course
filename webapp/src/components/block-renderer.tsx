// Renders the closed set of six block types the parser emits.
//
// The switch is exhaustive on purpose: `never` in the default branch means adding a block type to
// the pipeline without handling it here is a compile error, not a silently blank page.

import { Callout } from "@/components/ui/callout";
import type { Block } from "@/content/types";
import { InlineMd } from "./inline-md";

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const level = Math.min(Math.max(block.level, 1), 6);
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      // Content headings pick up the display role (Chakra Petch, uppercase) from the base layer.
      const size =
        level <= 2
          ? "text-2xl font-semibold"
          : level === 3
            ? "text-xl font-semibold"
            : "text-lg font-medium";
      return (
        <Tag className={`${size} mt-8 text-foreground first:mt-0`}>
          <InlineMd text={block.text} />
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p className="leading-7 text-ink-2">
          <InlineMd text={block.text} />
        </p>
      );

    case "list":
      return (
        <ul className="ml-1 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 leading-7 text-ink-2">
              {/* Square ink bullet (the DS has no circles); mt is tuned to leading-7. */}
              <span aria-hidden className="mt-[0.65rem] size-1.25 shrink-0 bg-ink-4" />
              <span>
                <InlineMd text={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "callout":
      return (
        <Callout as="aside" variant={block.disclaimer ? "disclaimer" : "info"}>
          {block.label && (
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest">
              <InlineMd text={block.label} />
            </p>
          )}
          {/* Callout text keeps its source line breaks; blank ones would render as empty rows. */}
          <div className="space-y-2 leading-7">
            {block.text
              .split("\n")
              .filter((line) => line.trim())
              .map((line, i) => (
                <p key={i}>
                  <InlineMd text={line} />
                </p>
              ))}
          </div>
        </Callout>
      );

    case "table":
      return (
        // Wide tables scroll inside their own box rather than pushing the page sideways.
        // Row 0 is the header row (the parser emits no <thead>); it gets the muted strip
        // and mono column-label treatment from the DS table language.
        <div className="overflow-x-auto border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className={r === 0 ? "bg-muted" : "border-t border-border"}>
                  {row.map((cell, c) =>
                    r === 0 ? (
                      <th
                        key={c}
                        className="px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                      >
                        <InlineMd text={cell} />
                      </th>
                    ) : (
                      <td key={c} className="px-4 py-2.5 align-top text-ink-2">
                        <InlineMd text={cell} />
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "code":
      return (
        <pre className="overflow-x-auto border border-border bg-muted p-4 text-sm">
          <code className={`language-${block.lang} font-mono text-ink-2`}>{block.code}</code>
        </pre>
      );

    default: {
      const exhaustive: never = block;
      void exhaustive;
      return null;
    }
  }
}
