// Verification test for F2 — confirms NO automated UI integration test
// exercises the Explain Availability button, loading state, confirmed-status
// rendering, or fallback behaviour. This is a meta-test: it asserts the
// absence of coverage rather than rendering the component (no DOM testing
// library is installed, so rendering is not possible without new deps).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(process.cwd(), "src");

function listFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, acc);
    else if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx"))
      acc.push(full);
  }
  return acc;
}

describe("F2 verification — UI integration test existence", () => {
  it("no test file imports App or references the Explain button", () => {
    const testFiles = listFiles(SRC_DIR);
    const importedApp: string[] = [];
    const mentionsExplainButton: string[] = [];
    const usesTestingLibrary: string[] = [];

    for (const file of testFiles) {
      // Exclude these verification files themselves from the scan.
      if (/f1RaceVerification|f2CoverageVerification/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      if (/\bfrom\s+["']@\/App["']|from\s+["']\.\.\/App["']|from\s+["']\.\.\/\.\.\/App["']/.test(src))
        importedApp.push(file);
      if (/Explain Availability|handleExplain|Mock AI Explanation/i.test(src))
        mentionsExplainButton.push(file);
      if (/@testing-library\/react|render\(|fireEvent|screen\./.test(src))
        usesTestingLibrary.push(file);
    }

    expect(importedApp).toEqual([]);
    expect(mentionsExplainButton).toEqual([]);
    expect(usesTestingLibrary).toEqual([]);
  });

  it("@testing-library/react and a DOM environment are not installed", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    expect(all["@testing-library/react"]).toBeUndefined();
    expect(all["jsdom"]).toBeUndefined();
    expect(all["happy-dom"]).toBeUndefined();

    // vite.config.ts has no test.environment set.
    const viteCfg = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");
    expect(/environment\s*:/i.test(viteCfg)).toBe(false);
    expect(existsSync(join(process.cwd(), "vitest.config.ts"))).toBe(false);
  });
});
