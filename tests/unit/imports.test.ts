import { describe, it, expect } from "vitest";
import { extractImports, resolveImport, packageName, aliasesFromTsconfig } from "@/lib/analysis/imports";

const specs = (path: string, code: string, ctx = {}) => extractImports(path, code, ctx).map((i) => i.specifier);

describe("extractImports JS/TS", () => {
  it("finds import, export-from, require, dynamic import, type imports", () => {
    const code = `
import a from "./a";
import { b } from './b';
import * as c from "c-pkg";
import type { T } from "./types";
import "./side-effect";
export { x } from "./x";
export * from "./star";
const r = require("./req");
const d = await import("./dyn");
`;
    expect(specs("src/f.ts", code).sort()).toEqual(
      ["./a", "./b", "c-pkg", "./types", "./side-effect", "./x", "./star", "./req", "./dyn"].sort(),
    );
  });
  it("does not report commented-out imports", () => {
    const code = `// import a from "./line"\n/* import b from "./block" */\nimport c from "./real";\n`;
    expect(specs("a.ts", code)).toEqual(["./real"]);
  });
  it("does not strip https:// inside strings as a comment", () => {
    const code = `const u = "https://example.com/x"; import z from "./after";\nimport y from "./next";`;
    expect(specs("a.js", code)).toEqual(expect.arrayContaining(["./after", "./next"]));
  });
  it("classifies kinds", () => {
    const r = extractImports("a.ts", `import a from "./a"; import b from "lodash"; import c from "/abs";`);
    expect(r.find((i) => i.specifier === "./a")!.kind).toBe("relative");
    expect(r.find((i) => i.specifier === "lodash")!.kind).toBe("package");
    expect(r.find((i) => i.specifier === "/abs")!.kind).toBe("absolute");
  });
});

describe("extractImports other languages", () => {
  it("python: from . import a, b (alone) yields sibling modules", () => {
    expect(specs("pkg/m.py", `from . import a, b\n`)).toEqual([".a", ".b"]);
  });
  it("python: parent-relative, dotted alias, comma imports, comments", () => {
    const s = specs("pkg/m.py", `from ..pkg.mod import x\nimport a.b as c\nimport os, sys\n# import hidden\n`);
    expect(s).toEqual(expect.arrayContaining(["..pkg.mod", "a.b", "os", "sys"]));
    expect(s).not.toContain("hidden");
  });
  it("python: `from . import a, b` followed by another import statement (REAL BUG: name list swallows next line)", () => {
    expect(specs("pkg/m.py", `from . import a, b\nfrom ..pkg.mod import x\n`)).toEqual([".a", ".b", "..pkg.mod"]);
  });
  it("go with module", () => {
    const code = `package main\nimport (\n  "fmt"\n  "example.com/m/internal/util"\n)\nimport "example.com/m"\n`;
    const r = extractImports("main.go", code, { goModule: "example.com/m" });
    expect(r).toContainEqual({ specifier: "internal/util", kind: "absolute", relation: undefined });
    expect(r.map((i) => i.specifier)).toEqual(expect.arrayContaining(["fmt", "."]));
    expect(r.find((i) => i.specifier === "fmt")!.kind).toBe("package");
  });
  it("rust mod and use crate", () => {
    const r = specs("src/main.rs", `mod x;\npub mod y;\nuse crate::a::b;\n// mod z;\n`);
    expect(r).toEqual(expect.arrayContaining(["mod:x", "mod:y", "crate:a::b"]));
    expect(r).not.toContain("mod:z");
  });
  it("java", () => {
    expect(specs("A.java", `import com.foo.Bar;\nimport static com.foo.Util.max;\n`)).toEqual(
      expect.arrayContaining(["jvm:com.foo.Bar", "jvm:com.foo.Util.max"]));
  });
  it("C include only quoted", () => {
    expect(specs("a.c", `#include <stdio.h>\n#include "util.h"\n`)).toEqual(["util.h"]);
  });
  it("ruby require_relative", () => {
    expect(specs("a.rb", `require_relative "lib/x"\nrequire 'json'\n`)).toEqual(["./lib/x"]);
  });
  it("html relations and external drop", () => {
    const html = `<!-- <script src="old.js"></script> -->
<link rel="stylesheet" href="style.css">
<script src="app.js"></script>
<script src="https://cdn.example.com/x.js"></script>
<a href="about.html">About</a><a href="https://example.com/p.html">ext</a>`;
    const r = extractImports("index.html", html);
    expect(r).toContainEqual({ specifier: "./style.css", kind: "relative", relation: "stylesheet" });
    expect(r).toContainEqual({ specifier: "./app.js", kind: "relative", relation: "script" });
    expect(r).toContainEqual({ specifier: "./about.html", kind: "relative", relation: "link" });
    expect(r.some((i) => i.specifier.includes("http") || i.specifier.includes("old.js"))).toBe(false);
  });
  it("css @import", () => {
    const r = extractImports("a.css", `@import "./base.css";\n@import url("https://fonts.x/y.css");`);
    expect(r.map((i) => i.specifier)).toEqual(["./base.css"]);
    expect(r[0].relation).toBe("stylesheet");
  });
});

const rc = (files: string[], aliases: Record<string, string> = { "@/": "src/" }) => ({ files: new Set(files), aliases });
const rel = (s: string) => ({ specifier: s, kind: "relative" as const });

describe("resolveImport", () => {
  it("resolves relative TS with extension omitted", () => {
    expect(resolveImport("src/a.ts", rel("./b"), rc(["src/b.ts"]))).toBe("src/b.ts");
  });
  it("./foo.js resolves to foo.ts", () => {
    expect(resolveImport("src/a.ts", rel("./foo.js"), rc(["src/foo.ts"]))).toBe("src/foo.ts");
  });
  it("index files", () => {
    expect(resolveImport("src/a.ts", rel("./lib"), rc(["src/lib/index.ts"]))).toBe("src/lib/index.ts");
  });
  it("@/ alias", () => {
    expect(resolveImport("src/x/y.ts", { specifier: "@/lib/z", kind: "package" }, rc(["src/lib/z.ts"]))).toBe("src/lib/z.ts");
  });
  it("escaping above root returns null", () => {
    expect(resolveImport("a.ts", rel("../outside"), rc(["outside.ts"]))).toBeNull();
  });
  it("external package is null", () => {
    expect(resolveImport("a.ts", { specifier: "react", kind: "package" }, rc(["react.ts"]))).toBeNull();
  });
  it("python relative", () => {
    expect(resolveImport("pkg/m.py", rel(".util"), rc(["pkg/util.py"]))).toBe("pkg/util.py");
    expect(resolveImport("pkg/sub/m.py", rel("..util"), rc(["pkg/util.py"]))).toBe("pkg/util.py");
  });
  it("python absolute incl. src layout and __init__", () => {
    expect(resolveImport("main.py", { specifier: "app.core", kind: "package" }, rc(["src/app/core.py"]))).toBe("src/app/core.py");
    expect(resolveImport("main.py", { specifier: "app", kind: "package" }, rc(["app/__init__.py"]))).toBe("app/__init__.py");
  });
  it("go package dir", () => {
    const r = resolveImport("main.go", { specifier: "internal/util", kind: "absolute" }, rc(["internal/util/a.go", "internal/util/a_test.go"]));
    expect(r).toBe("internal/util/a.go");
  });
  it("rust mod.rs and sibling", () => {
    expect(resolveImport("src/main.rs", { specifier: "mod:net", kind: "relative" }, rc(["src/net/mod.rs"]))).toBe("src/net/mod.rs");
    expect(resolveImport("src/main.rs", { specifier: "mod:util", kind: "relative" }, rc(["src/util.rs"]))).toBe("src/util.rs");
  });
  it("rust crate path", () => {
    expect(resolveImport("src/main.rs", { specifier: "crate:a::b", kind: "absolute" }, rc(["src/a.rs"]))).toBe("src/a.rs");
  });
});

describe("packageName", () => {
  it("handles scopes and subpaths", () => {
    expect(packageName("@scope/pkg/sub")).toBe("@scope/pkg");
    expect(packageName("lodash/fp")).toBe("lodash");
    expect(packageName("./x")).toBeNull();
    expect(packageName("../x")).toBeNull();
    expect(packageName("node:fs")).toBe("node:fs");
  });
});

describe("aliasesFromTsconfig", () => {
  it("parses comments, trailing commas and paths", () => {
    const ts = `{
  // comment
  "compilerOptions": {
    /* block */
    "paths": { "@/*": ["./src/*"], },
  },
}`;
    expect(aliasesFromTsconfig(ts, new Set(["src/a.ts"]))).toEqual({ "@/": "src/" });
  });
  it("respects baseUrl", () => {
    expect(aliasesFromTsconfig(`{"compilerOptions":{"baseUrl":"./app","paths":{"#/*":["./lib/*"]}}}`, new Set())).toEqual({ "#/": "app/lib/" });
  });
  it("falls back to @/ → src/ when src exists and no config", () => {
    expect(aliasesFromTsconfig(null, new Set(["src/a.ts"]))["@/"]).toBe("src/");
  });
});

describe("python relative imports with aliases", () => {
  it("keeps only the module name for `from . import a as b`", () => {
    const specs = extractImports("pkg/m.py", "from . import a as b, c\n").map((i) => i.specifier);
    expect(specs).toEqual([".a", ".c"]);
  });
  it("supports parenthesised multi-line name lists", () => {
    const specs = extractImports("pkg/m.py", "from . import (\n  a,\n  b,\n)\nimport os\n").map((i) => i.specifier);
    expect(specs).toEqual([".a", ".b", "os"]);
  });
});
