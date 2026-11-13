// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContributePanel } from "@/components/explorer/ContributePanel";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { assembleAnalysis } from "@/lib/analysis/assemble";
import { issue, longBody, miniRaw } from "./fixtures";

afterEach(cleanup);

describe("SafeMarkdown", () => {
  it("renders model output as text, never as HTML", () => {
    const { container } = render(
      <SafeMarkdown text={'## Title\n<img src=x onerror="alert(1)"><script>alert(1)</script>\n- **bold** and `src/a.ts`'} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(screen.getByRole("heading", { name: "Title" })).toBeTruthy();
  });

  it("drops link targets (no javascript: URLs can be rendered)", () => {
    const { container } = render(<SafeMarkdown text={"[click me](javascript:alert(1))"} />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("click me");
  });

  it("turns file paths in inline code into buttons when a handler is given", () => {
    const onPath = vi.fn();
    render(<SafeMarkdown text={"Open `src/lib/a.ts` first."} onPath={onPath} />);
    fireEvent.click(screen.getByRole("button", { name: "src/lib/a.ts" }));
    expect(onPath).toHaveBeenCalledWith("src/lib/a.ts");
  });
});

describe("ContributePanel", () => {
  const analysis = assembleAnalysis({
    ...miniRaw,
    issues: [
      issue({ number: 1, title: "Show error on bad password", labels: [{ name: "good first issue" }] }),
      issue({ number: 2, title: "Rewrite the architecture", body: "tbd", labels: [{ name: "good first issue" }] }),
      issue({ number: 3, title: "Assigned already", labels: [{ name: "good first issue" }], assignee: { login: "x" }, body: longBody }),
    ],
  });

  it("only badges issues as good first when their content passes the checks", () => {
    render(<ContributePanel analysis={analysis} onOpenFile={() => {}} />);
    const cards = screen.getAllByRole("listitem").filter((li) => li.querySelector("h3"));
    const byNumber = (n: number) => cards.find((c) => c.textContent?.includes(`#${n}`))!;
    expect(within(byNumber(1)).getByText("Good first issue")).toBeTruthy();
    expect(within(byNumber(2)).queryByText("Good first issue")).toBeNull();
    expect(within(byNumber(3)).getByText("Not for a first PR")).toBeTruthy();
  });

  it("links to the original issue and explains its reasoning", () => {
    render(<ContributePanel analysis={analysis} onOpenFile={() => {}} />);
    const link = screen.getAllByRole("link").find((a) => a.getAttribute("href") === "https://github.com/acme/mini/issues/1");
    expect(link).toBeTruthy();
    expect(screen.getAllByText(/Maintainers labelled it/).length).toBeGreaterThan(0);
  });

  it("opens mentioned files in the explorer", () => {
    const onOpenFile = vi.fn();
    render(<ContributePanel analysis={analysis} onOpenFile={onOpenFile} />);
    fireEvent.click(screen.getAllByRole("button", { name: "src/lib/a.ts" })[0]);
    expect(onOpenFile).toHaveBeenCalledWith("src/lib/a.ts");
  });

  it("filters to good first issues", () => {
    render(<ContributePanel analysis={analysis} onOpenFile={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Good first \(1\)/ }));
    expect(screen.queryByText(/Rewrite the architecture/)).toBeNull();
    expect(screen.getByText(/Show error on bad password/)).toBeTruthy();
  });
});
