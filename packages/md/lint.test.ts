import {describe, expect, test} from "bun:test";
import {run} from "./md.test.ts";

describe("lint", () => {
  test("reports all rules violations and exits 1", async () => {
    const {out, code} = await run(["lint", "lint.md"]);
    expect(code).toBe(1);
    expect(out).toContain("lint.md\n  1: missing-h1:");
    expect(out).toContain("  3: heading-skip:");
    expect(out).toContain("  5: duplicate-heading:");
    expect(out).toContain("  7: broken-link:");
    expect(out).toContain("  9: empty-link-url:");
    expect(out).toContain("  11: unclosed-fence:");
  });

  test("exits 0 and stays silent on a clean file", async () => {
    const {out, code} = await run(["lint", "basic.md"]);
    expect(code).toBe(0);
    expect(out).toBe("");
  });

  test("flags problems across a whole directory", async () => {
    const {out, code} = await run(["lint"]);
    expect(code).toBe(1);
    expect(out).toContain("lint.md\n  1: missing-h1:");
    expect(out).toContain("  3: heading-skip:");
    expect(out).toContain("  5: duplicate-heading:");
    expect(out).toContain("  7: broken-link:");
    expect(out).toContain("  9: empty-link-url:");
    expect(out).toContain("  11: unclosed-fence:");
  });

  test("exits 0 on a clean directory", async () => {
    const {out, code} = await run(["lint", "nested"]);
    expect(code).toBe(0);
    expect(out).toBe("");
  });

  test("errors on a missing path", async () => {
    const {err, code} = await run(["lint", "nope.md"]);
    expect(code).toBe(1);
    expect(err).toContain("File not found: nope.md");
  });
});

describe("lint schema", () => {
  test("exits 0 silently when frontmatter matches the schema", async () => {
    const {out, code} = await run(["lint", "schema", "schema.md", "schema.json"]);
    expect(code).toBe(0);
    expect(out).toBe("");
  });

  test("reports violations and exits 1", async () => {
    const {out, err, code} = await run(["lint", "schema", "schema-bad.md", "schema.json"]);
    expect(code).toBe(1);
    expect(out).toContain("schema-bad.md\n  schema: /description must be string");
    expect(err).toContain("1 issues found");
  });

  test("supports 2020-12 schemas", async () => {
    const {out, code} = await run(["lint", "schema", "schema.md", "schema-2020.json"]);
    expect(code).toBe(0);
    expect(out).toBe("");
  });

  test("errors when the file has no frontmatter", async () => {
    const {err, code} = await run(["lint", "schema", "empty.md", "schema.json"]);
    expect(code).toBe(1);
    expect(err).toContain("No frontmatter in empty.md");
  });

  test("errors on a missing schema", async () => {
    const {err, code} = await run(["lint", "schema", "schema.md", "nope.json"]);
    expect(code).toBe(1);
    expect(err).toContain("File not found: nope.json");
  });
});
