// Renders the closed set of six block types the parser emits.
//
// The switch is exhaustive on purpose: `never` in the default branch means adding a block type to
// the pipeline without handling it here is a compile error, not a silently blank page.

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
      const size =
        level <= 2
          ? "text-2xl font-semibold"
          : level === 3
            ? "text-xl font-semibold"
            : "text-lg font-medium";
      return (
        <Tag className={`${size} mt-8 text-slate-100 first:mt-0`}>
          <InlineMd text={block.text} />
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p className="leading-7 text-slate-300">
          <InlineMd text={block.text} />
        </p>
      );

    case "list":
      return (
        <ul className="ml-1 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 leading-7 text-slate-300">
              <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-slate-600" />
              <span>
                <InlineMd text={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "callout":
      return (
        <aside
          className={`rounded-lg border-l-4 p-4 ${
            block.disclaimer
              ? "border-slate-600 bg-slate-900/60 text-sm text-slate-400"
              : "border-sky-500 bg-sky-950/40 text-slate-300"
          }`}
        >
          {block.label && (
            <p className="mb-1 font-semibold text-slate-100">
              <InlineMd text={block.label} />
            </p>
          )}
          {/* Callout text keeps its source line breaks. */}
          <div className="space-y-2 leading-7">
            {block.text.split("\n").map((line, i) => (
              <p key={i}>
                <InlineMd text={line} />
              </p>
            ))}
          </div>
        </aside>
      );

    case "table":
      return (
        // Wide tables scroll inside their own box rather than pushing the page sideways.
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full border-collapse text-left text-sm">
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className={r === 0 ? "bg-slate-900" : "border-t border-slate-800"}>
                  {row.map((cell, c) =>
                    r === 0 ? (
                      <th key={c} className="px-4 py-2.5 font-semibold text-slate-100">
                        <InlineMd text={cell} />
                      </th>
                    ) : (
                      <td key={c} className="px-4 py-2.5 align-top text-slate-300">
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
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm">
          <code className={`language-${block.lang} font-mono text-slate-300`}>{block.code}</code>
        </pre>
      );

    default: {
      const exhaustive: never = block;
      void exhaustive;
      return null;
    }
  }
}
