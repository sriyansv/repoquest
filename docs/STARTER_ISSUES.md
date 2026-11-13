# Starter issues to open after publishing

Each one is a real gap in the current code. Open them on `sriyansv/repoquest` with the labels shown. They are written so RepoQuest's own assessor rates them "good first issue": clear scope, files named, acceptance criteria. Copy the title and body as-is.

---

### 1. Extract `using` statements from C# files
**Labels:** `good first issue`, `help wanted`, `analyzer`

C# files are detected as a language, but their imports are never read, so C# projects show no confirmed arrows on the architecture map.

**What to do**
- In `src/lib/analysis/imports.ts`, add a branch to `extractImports` for the `cs` extension that captures `using Foo.Bar;` (ignore `using static` and `using X = Y;` aliases for now).
- In `resolveImport`, map a namespace to a file the same way the JVM branch does (`jvm:` prefix → path suffix match), returning `null` when no file matches.

**Acceptance criteria**
- [ ] `using MyApp.Services;` in `src/Program.cs` resolves to `src/Services/…` when such a file exists
- [ ] `using System.Text;` is not reported as a confirmed edge
- [ ] Tests added in `tests/unit/imports.test.ts`
- [ ] `npm test` and `npm run lint` pass

---

### 2. Extract PHP `use`, `require` and `include` statements
**Labels:** `good first issue`, `help wanted`, `analyzer`

PHP repositories currently get no confirmed edges.

**What to do**
- In `src/lib/analysis/imports.ts`, handle the `php` extension: `require`/`require_once`/`include`/`include_once` with a quoted relative path (relative imports), and `use App\Models\User;` (namespace → path, like the JVM branch, with `\` as the separator).

**Acceptance criteria**
- [ ] `require_once __DIR__ . '/lib/db.php';` and `require 'lib/db.php';` resolve to `lib/db.php` when it exists
- [ ] `use App\Models\User;` resolves to a file ending in `Models/User.php`
- [ ] Unit tests added in `tests/unit/imports.test.ts`; `npm test` passes

---

### 3. Show "files analyzed" for each module in the architecture side panel
**Labels:** `good first issue`, `ui`

The map says "Built from N source files we read", but a module's panel doesn't say how many of *its* files were read. Users can't tell whether a missing arrow means "no dependency" or "not analyzed".

**What to do**
- In `src/components/explorer/ArchitecturePanel.tsx`, count the module's files that appear in `graph.fileDependencies` or were analyzed. Add an `analyzedPaths: string[]` field to `ArchitectureGraph` in `src/lib/types.ts`, filled in `buildArchitecture` (`src/lib/analysis/graph.ts`).
- Show "Imports read from X of Y files in this module" under the module title.

**Acceptance criteria**
- [ ] The number is correct for the landing-page demo (`npm run demo:build` then `npm run dev`)
- [ ] A unit test in `tests/unit/graph.test.ts` checks `analyzedPaths`
- [ ] Screenshot in the PR

---

### 4. Resolve Java/Kotlin wildcard imports to a package directory
**Labels:** `good first issue`, `analyzer`

`import com.example.util.*;` is currently stripped to `com.example.util`, then matched as if it were a class, so it never resolves.

**What to do**
- In `src/lib/analysis/imports.ts`, keep a marker when the import ends in `.*`. In `resolveImport`, link to the first file in a directory whose path ends with `com/example/util/`.

**Acceptance criteria**
- [ ] `import com.example.util.*;` resolves to e.g. `src/main/java/com/example/util/Strings.java`
- [ ] Non-wildcard imports behave exactly as before (existing tests still pass)
- [ ] New tests in `tests/unit/imports.test.ts`

---

### 5. Keyboard shortcut: `/` focuses the file search
**Labels:** `good first issue`, `ui`, `accessibility`

Developers expect `/` to jump to search, as on GitHub.

**What to do**
- In `src/components/explorer/FilesPanel.tsx`, listen for `/` on `window` (only when focus is not already in an input or textarea) and focus the "Search files" input. Add `aria-keyshortcuts="/"` to the input.

**Acceptance criteria**
- [ ] Pressing `/` on the Files tab focuses search; typing `/` inside an input still types a slash
- [ ] Works with the keyboard only; no console errors
- [ ] Mention the shortcut in the input's placeholder or a hint

---

### 6. Go: link imports to the package, not just its first file
**Labels:** `help wanted`, `analyzer`

A Go import names a package (a directory), but `resolveImport` links to the first non-test `.go` file in that directory. Module-level arrows are right, but file-level "Used by" lists can be misleading.

**What to do**
- Decide on a representation (for example, a `FileDependency` whose `to` is the directory, with `relation: "import"`), update `buildArchitecture` and the Files tab's "Uses" list, and document the choice in `docs/ARCHITECTURE.md`.

**Acceptance criteria**
- [ ] A Go package import shows as the package directory in the Files tab
- [ ] Module edges unchanged for Go repos (tests in `tests/unit/graph.test.ts`)
- [ ] Architecture doc updated

(This one is a bigger design change, so it's labelled `help wanted` rather than `good first issue`.)
