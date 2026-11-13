import { Fragment, type ReactNode } from "react";

/**
 * A deliberately small Markdown renderer for AI output.
 * It builds React elements (no dangerouslySetInnerHTML), so model output can
 * never inject HTML or scripts. Supports headings, lists, paragraphs, code
 * blocks, inline code, bold and italics. Links are rendered as plain text.
 */
export function SafeMarkdown({ text, onPath }: { text: string; onPath?: (path: string) => void }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key++} className="scroll-thin my-3 overflow-x-auto rounded-lg border border-line bg-ink-2 p-3 font-mono text-[13px] leading-relaxed">
          {body.join("\n")}
        </pre>,
      );
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const cls = lvl <= 2 ? "mt-5 mb-2 text-base font-semibold text-fg" : "mt-4 mb-1.5 text-sm font-semibold text-fg";
      blocks.push(<p key={key++} role="heading" aria-level={Math.min(lvl + 2, 6)} className={cls}>{inline(h[2], onPath)}</p>);
      i++;
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, "");
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(item);
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key++} className={`my-2 space-y-1.5 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-faint`}>
          {items.map((it, j) => <li key={j}>{inline(it, onPath)}</li>)}
        </List>,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*([-*+]|\d+[.)])\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key++} className="my-2 leading-relaxed">{inline(para.join(" "), onPath)}</p>);
  }
  return <div className="text-[14.5px] text-muted [&_strong]:text-fg">{blocks}</div>;
}

function inline(s: string, onPath?: (p: string) => void): ReactNode {
  // Strip link syntax to plain text; keep code/bold/italic.
  const text = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("`")) {
      const code = tok.slice(1, -1);
      const looksPath = onPath && /^[\w@.-]+(\/[\w@.-]+)*\.[\w]+$|^[\w@.-]+\/[\w@./-]+$/.test(code);
      out.push(
        looksPath ? (
          <button key={k++} type="button" onClick={() => onPath!(code)} className="rounded bg-ink-2 px-1 py-px font-mono text-[0.85em] text-amber-2 underline decoration-amber/30 underline-offset-2 hover:decoration-amber">
            {code}
          </button>
        ) : (
          <code key={k++} className="rounded bg-ink-2 px-1 py-px font-mono text-[0.85em] text-amber-2">{code}</code>
        ),
      );
    } else if (tok.startsWith("**") || tok.startsWith("__")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index! + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return out;
}
