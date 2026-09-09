import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx|css)$/.test(name)
        ? [path]
        : [];
  });
}

function managedReferences() {
  const root = resolve(process.cwd());
  const references = new Set<string>();
  for (const file of sourceFiles(join(root, "client/src"))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\/manus-storage\/[A-Za-z0-9._-]+/g)) {
      references.add(match[0]);
    }
  }
  return [...references].sort();
}

describe("managed media asset manifest", () => {
  it("lists every managed-storage reference used by the source", () => {
    const manifest = readFileSync(
      resolve(process.cwd(), "docs/assets/asset-manifest.md"),
      "utf8"
    );
    const listed = [...manifest.matchAll(/`(\/manus-storage\/[^`]+)`/g)]
      .map(match => match[1])
      .sort();
    expect(listed).toEqual(managedReferences());
  });

  it("contains no duplicate managed-storage rows", () => {
    const manifest = readFileSync(
      resolve(process.cwd(), "docs/assets/asset-manifest.md"),
      "utf8"
    );
    const listed = [...manifest.matchAll(/`(\/manus-storage\/[^`]+)`/g)].map(
      match => match[1]
    );
    expect(new Set(listed).size).toBe(listed.length);
  });
});
