import { extOf } from "./analysis/languages";

/**
 * Tiny syntax highlighter: comments, strings, numbers, keywords and type-like
 * identifiers. Not a parser — just enough colour to make code easier to scan,
 * without shipping a large highlighting library.
 */

export type Token = { t: "k" | "s" | "c" | "n" | "t" | "p"; v: string };

const KW: Record<string, string[]> = {
  js: "import export from default const let var function return if else for while do switch case break continue new class extends super this typeof instanceof in of async await try catch finally throw yield interface type enum implements public private protected readonly static as satisfies null undefined true false void".split(" "),
  py: "import from as def class return if elif else for while in not and or is None True False try except finally raise with lambda yield async await pass break continue global nonlocal self".split(" "),
  go: "package import func return if else for range switch case default break continue go defer chan map struct interface type var const nil true false select fallthrough".split(" "),
  rs: "use mod pub fn let mut const static struct enum impl trait for in if else match loop while return self Self crate super where async await move ref true false as dyn unsafe type".split(" "),
  c: "int char float double void long short unsigned signed struct union enum typedef static const return if else for while do switch case break continue sizeof include define class public private protected virtual namespace template typename new delete true false nullptr package import extends implements final abstract interface throws try catch throw".split(" "),
  rb: "def end class module if elsif else unless while until for in do return yield begin rescue ensure raise require require_relative self nil true false and or not attr_accessor".split(" "),
  sh: "if then else elif fi for while do done case esac function return export local in echo".split(" "),
};

function family(path: string): { kw: string[]; line: string[]; block: [string, string] | null } | null {
  const e = extOf(path);
  if (["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts", "cts", "vue", "svelte", "astro"].includes(e)) return { kw: KW.js, line: ["//"], block: ["/*", "*/"] };
  if (["py", "pyi"].includes(e)) return { kw: KW.py, line: ["#"], block: null };
  if (e === "go") return { kw: KW.go, line: ["//"], block: ["/*", "*/"] };
  if (e === "rs") return { kw: KW.rs, line: ["//"], block: ["/*", "*/"] };
  if (["c", "h", "cc", "cpp", "hpp", "cxx", "java", "kt", "kts", "cs", "swift", "scala", "dart", "php"].includes(e)) return { kw: KW.c, line: ["//"], block: ["/*", "*/"] };
  if (e === "rb") return { kw: KW.rb, line: ["#"], block: null };
  if (["sh", "bash", "zsh", "yml", "yaml", "toml"].includes(e)) return { kw: KW.sh, line: ["#"], block: null };
  if (["css", "scss", "less"].includes(e)) return { kw: [], line: e === "css" ? [] : ["//"], block: ["/*", "*/"] };
  if (["html", "htm", "xml", "svg", "md"].includes(e)) return { kw: [], line: [], block: ["<!--", "-->"] };
  if (e === "json") return { kw: ["true", "false", "null"], line: [], block: null };
  return null;
}

/** Tokenize a whole file into lines of tokens. Returns null when highlighting is not supported. */
export function highlight(path: string, code: string): Token[][] | null {
  const fam = family(path);
  if (!fam || code.length > 300_000) return null;
  const kw = new Set(fam.kw);
  const lines: Token[][] = [[]];
  const push = (t: Token["t"], v: string) => {
    const parts = v.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ t, v: part });
    });
  };

  let i = 0;
  let plain = "";
  const flush = () => {
    if (plain) push("p", plain);
    plain = "";
  };
  while (i < code.length) {
    const ch = code[i];
    if (fam.block && code.startsWith(fam.block[0], i)) {
      const end = code.indexOf(fam.block[1], i + fam.block[0].length);
      const j = end === -1 ? code.length : end + fam.block[1].length;
      flush(); push("c", code.slice(i, j)); i = j; continue;
    }
    const lc = fam.line.find((l) => code.startsWith(l, i));
    if (lc && !(lc === "//" && code[i - 1] === ":")) {
      const end = code.indexOf("\n", i);
      const j = end === -1 ? code.length : end;
      flush(); push("c", code.slice(i, j)); i = j; continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) {
        if (code[j] === "\\") j++;
        else if (code[j] === "\n" && ch !== "`") break;
        j++;
      }
      j = Math.min(j + 1, code.length);
      flush(); push("s", code.slice(i, j)); i = j; continue;
    }
    if (/[0-9]/.test(ch) && !/[\w$]/.test(code[i - 1] ?? "")) {
      const m = code.slice(i).match(/^(0x[\da-f]+|\d[\d_]*(\.\d+)?(e[+-]?\d+)?)/i)!;
      flush(); push("n", m[0]); i += m[0].length; continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      const m = code.slice(i).match(/^[A-Za-z_$][\w$]*/)!;
      const w = m[0];
      if (kw.has(w)) { flush(); push("k", w); }
      else if (/^[A-Z][a-z0-9]/.test(w) && fam.kw.length) { flush(); push("t", w); }
      else plain += w;
      i += w.length;
      continue;
    }
    plain += ch;
    i++;
  }
  flush();
  return lines;
}
