import { describe, expect, it } from "vitest";
import { exportsEntry, scriptWorkingDir } from "@/lib/analysis/manifest";
import { detectEntryPoints } from "@/lib/analysis/structure";
import type { TreeEntry } from "@/lib/types";

const t = (paths: string[]): TreeEntry[] => paths.map((path) => ({ path, type: "blob", size: 100 }));

describe("exportsEntry", () => {
  it("handles all common shapes", () => {
    expect(exportsEntry("./index.js")).toBe("./index.js");
    expect(exportsEntry({ ".": "./a.js", "./sub": "./b.js" })).toBe("./a.js");
    expect(exportsEntry({ ".": { import: "./a.mjs", require: "./a.cjs" } })).toBe("./a.mjs");
    // sindresorhus/got: conditions at the top level, types listed first
    expect(exportsEntry({ types: "./dist/source/index.d.ts", default: "./dist/source/index.js" })).toBe("./dist/source/index.js");
    expect(exportsEntry({ ".": { import: { types: "./x.d.ts", default: "./x.js" } } })).toBe("./x.js");
    expect(exportsEntry(null)).toBeNull();
    expect(exportsEntry(["./a.js"])).toBeNull();
  });
});

describe("scriptWorkingDir", () => {
  it("finds the app directory a script runs in", () => {
    expect(scriptWorkingDir("yarn --cwd ./excalidraw-app start")).toBe("excalidraw-app");
    expect(scriptWorkingDir("npm --prefix web run dev")).toBe("web");
    expect(scriptWorkingDir("cd frontend && vite")).toBe("frontend");
    expect(scriptWorkingDir("pnpm --filter ./apps/site dev")).toBe("apps/site");
    expect(scriptWorkingDir("npm run dev -w docs")).toBe("docs");
    expect(scriptWorkingDir("next dev")).toBeNull();
    expect(scriptWorkingDir("cd .. && x")).toBeNull();
  });
});

describe("entry points for real manifest shapes", () => {
  it("sindresorhus/got: top-level conditional exports pointing at build output", () => {
    const eps = detectEntryPoints(t(["package.json", "source/index.ts", "source/core/index.ts"]), {
      packageJson: JSON.stringify({ name: "got", exports: { types: "./dist/source/index.d.ts", default: "./dist/source/index.js" } }),
    });
    expect(eps[0]?.path).toBe("source/index.ts");
  });
  it("excalidraw: the start script runs an app in a sub-directory", () => {
    const eps = detectEntryPoints(t(["package.json", "Dockerfile", "excalidraw-app/index.tsx", "excalidraw-app/App.tsx", "excalidraw-app/index.html"]), {
      packageJson: JSON.stringify({ scripts: { start: "yarn --cwd ./excalidraw-app start" } }),
    });
    expect(eps[0]?.path).toBe("excalidraw-app/index.tsx");
    expect(eps[0]?.reason).toMatch(/excalidraw-app/);
    expect(eps.at(-1)?.path).toBe("Dockerfile");
  });
});
