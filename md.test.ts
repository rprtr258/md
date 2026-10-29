import {describe, expect, test} from "bun:test";
import {join} from "node:path";
import {command} from "./index.ts";

const dir = join(import.meta.dir, "testdata");

export async function run(args: string[], input?: string) {
  const out: string[] = [];
  const err: string[] = [];
  const realLog = console.log;
  const realError = console.error;
  const realWrite = process.stdout.write;
  const realStdin = Bun.stdin;
  console.log = (...values: unknown[]) => out.push(values.map(String).join(" ") + "\n");
  console.error = (...values: unknown[]) => err.push(values.map(String).join(" ") + "\n");
  process.stdout.write = ((chunk: unknown): boolean => {
    out.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  if (input !== undefined)
    (Bun as {stdin: unknown}).stdin = {text: () => Promise.resolve(input)};
  const cwd = process.cwd();
  process.chdir(dir);
  const code = await (async () => {
    const prevExit = process.exitCode;
    try {
      await command.parse(args);
      return 0;
    } catch (caught) {
      err.push((caught instanceof Error ? caught.message : String(caught)) + "\n");
      return 1;
    } finally {
      console.log = realLog;
      console.error = realError;
      process.stdout.write = realWrite;
      (Bun as {stdin: unknown}).stdin = realStdin;
      process.chdir(cwd);
      process.exitCode = prevExit;
    }
  })();
  return {out: out.join(""), err: err.join(""), code};
}

describe("toc", () => {
  test("prints the indented heading tree", async () => {
    const {out, code} = await run(["toc", "basic.md"]);
    expect(code).toBe(0);
    expect(out).toBe("- [Intro](#intro)\n  - [Install](#install)\n    - [Details](#details)\n  - [Usage](#usage)\n");
  });
});

describe("section", () => {
  test("prints everything under a heading", async () => {
    const {out, code} = await run(["section", "basic.md", "Install"]);
    expect(code).toBe(0);
    expect(out).toBe("## Install\n\nRun [bun](https://bun.com) and ![logo](logo.png).\n\n### Details\n\nDeep stuff.\n\n");
  });

  test("matches headings forgivingly (#s, case, whitespace)", async () => {
    const {out, code} = await run(["section", "basic.md", "## install "]);
    expect(code).toBe(0);
    expect(out).toBe("## Install\n\nRun [bun](https://bun.com) and ![logo](logo.png).\n\n### Details\n\nDeep stuff.\n\n");
  });

  test("matches slugs", async () => {
    const {out, code} = await run(["section", "basic.md", "#details"]);
    expect(code).toBe(0);
    expect(out).toBe("### Details\n\nDeep stuff.\n\n");
  });

  test("errors on missing heading", async () => {
    const {err, code} = await run(["section", "basic.md", "Nope"]);
    expect(code).toBe(1);
    expect(err).toContain("Heading not found: Nope");
  });
});

describe("get", () => {
  test("prints help to stdout and exits 0", async () => {
    const {out, code} = await run(["get"]);
    expect(code).toBe(0);
    expect(out).toContain("frontmatter");
  });

  describe("frontmatter", () => {
    test("prints raw yaml", async () => {
      const {out, code} = await run(["get", "frontmatter", "basic.md"]);
      expect(code).toBe(0);
      expect(out).toContain("title: Test");
      expect(out).toContain("tags: [a, b]");
    });

    test("--json prints parsed frontmatter", async () => {
      const {out, code} = await run(["get", "frontmatter", "--json", "basic.md"]);
      expect(code).toBe(0);
      expect(out).toContain('"title": "Test"');
    });

    test("reads stdin with -", async () => {
      const {out, code} = await run(["get", "frontmatter", "-"], "---\nkey: value\n---\n");
      expect(code).toBe(0);
      expect(out).toContain("key: value");
    });

    test("prints nothing for a file without frontmatter", async () => {
      const {out, code} = await run(["get", "frontmatter", "empty.md"]);
      expect(code).toBe(0);
      expect(out).toBe("");
    });
  });

  describe("links", () => {
    test("prints every url one per line", async () => {
      const {out, code} = await run(["get", "links", "basic.md"]);
      expect(code).toBe(0);
      expect(out).toBe("https://bun.com\nlogo.png\n./other.md\n");
    });

    test("resolves reference-style links", async () => {
      const {out, code} = await run(["get", "links", "reflinks.md"]);
      expect(code).toBe(0);
      expect(out).toBe("https://www.somewebsite.com\nhttps://www.somewebsite.org\n../blob/master/LICENSE\nhttp://somewebsite.org\nhttp://www.somewebsite.com\n");
    });

    test("deduplicates repeated urls keeping first occurrence", async () => {
      const {out, code} = await run(["get", "links", "-"], "[a](https://x.com)\n\n[b](https://x.com)\n\n[c](https://y.com)\n");
      expect(code).toBe(0);
      expect(out).toBe("https://x.com\nhttps://y.com\n");
    });
  });

  describe("todos", () => {
    test("prints task list item lines with checkbox state", async () => {
      const {out, code} = await run(["get", "todos", "-"], "- [ ] open\n- [x] done\n");
      expect(code).toBe(0);
      expect(out).toBe("- [ ] open\n- [x] done\n");
    });

    test("includes nested and ordered task items, skips plain list items", async () => {
      const {out, code} = await run(["get", "todos", "-"], "- plain\n- [ ] open\n  - [x] nested\n\n1. [ ] ordered\n- [ ]notask\n");
      expect(code).toBe(0);
      expect(out).toBe("- [ ] open\n  - [x] nested\n1. [ ] ordered\n");
    });

    test("prints nothing for a file without task lists", async () => {
      const {out, code} = await run(["get", "todos", "basic.md"]);
      expect(code).toBe(0);
      expect(out).toBe("");
    });
  });
});

describe("stats", () => {
  test("prints line counts and size", async () => {
    const {out, code} = await run(["stats", "basic.md"]);
    expect(code).toBe(0);
    expect(out).toBe("lines: 20\nloc: 12\nsize: 179 B\n");
  });

  test("reads stdin with -", async () => {
    const {out, code} = await run(["stats", "-"], "# Only\n\n\nbody\n");
    expect(code).toBe(0);
    expect(out).toBe("lines: 4\nloc: 2\nsize: 14 B\n");
  });
});

describe("list", () => {
  test("prints all markdown files recursively", async () => {
    const {out, code} = await run(["list"]);
    expect(code).toBe(0);
    expect(out).toContain("basic.md");
    expect(out).toContain("empty.md");
    expect(out).toContain("lint.md");
    expect(out).toContain("nested/note.md");
  });
});

describe("map", () => {
  test("prints each file with its heading tree", async () => {
    const {out, code} = await run(["map"]);
    expect(code).toBe(0);
    expect(out).toContain("basic.md\n  Intro\n    Install\n");
    expect(out).toContain("nested/note.md\n  Note\n    Sub\n");
  });

  test("--title prints one line per file", async () => {
    const {out, code} = await run(["map", "--title"]);
    expect(code).toBe(0);
    expect(out).toContain("basic.md: Intro\n");
    expect(out).toContain("nested/note.md: Note\n");
    expect(out).toContain("lint.md\n");
  });
});
