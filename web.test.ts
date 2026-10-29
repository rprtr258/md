import {describe, expect, test} from "bun:test";
import {render} from "./common/web.ts";

describe("render", () => {
  test.each([
    ["frontmatter as table above the body", "---\ntitle: x\ntags:\n  - a\n  - b\nmeta:\n  y: 1\n---\n\n# Hello\n\n**world**\n"],
    ["no frontmatter has no separator", "# Hello\n"],
    ["non-object frontmatter as raw code", "---\njust a string\n---\n\n# Hello\n"],
    ["mermaid block becomes a mermaid diagram with the vendored script", "# Hello\n\n```mermaid\ngraph TD\nA-->B\n```\n"],
  ])("%s", (_name, input) => {
    expect(render(input)).toMatchSnapshot();
  });

  test("gfm tables render", async () => {
    const html = render(await Bun.file(new URL("testdata/tables.md", import.meta.url)).text());
    expect(html.match(/<table/g)).toHaveLength(2);
  });

  test("reference links render resolved", async () => {
    const html = render(await Bun.file(new URL("testdata/reflinks.md", import.meta.url)).text());
    const hrefs = [...html.matchAll(/<a href="([^"]+)"/g)].map((match) => match[1]!);
    expect(hrefs).toEqual([
      "https://www.somewebsite.com",
      "https://www.somewebsite.com",
      "https://www.somewebsite.org",
      "../blob/master/LICENSE",
      "http://somewebsite.org",
      "http://www.somewebsite.com",
    ]);
  });

  test("relative image srcs point at the source directory", () => {
    const html = render("![logo](./img/logo.png)", "/home/me/docs");
    expect(html).toContain(`<img src="file:///home/me/docs/img/logo.png" alt="logo">`);
  });

  test("reference-style images point at the source directory", () => {
    const html = render("![logo][ref]\n\n[ref]: sub/logo.png", "/home/me/docs");
    expect(html).toContain(`src="file:///home/me/docs/sub/logo.png"`);
  });

  test("percent-encoded characters survive the file url round-trip", () => {
    const html = render("![pic](<my pic.png>)", "/home/me/docs");
    expect(html).toContain(`src="file:///home/me/docs/my%20pic.png"`);
  });

  test("absolute, remote, and data image urls stay untouched", () => {
    const html = render("![a](https://x.com/i.png)\n\n![b](/root.png)\n\n![c](data:image/png;base64,AAAA)", "/home/me/docs");
    expect(html).toContain(`src="https://x.com/i.png"`);
    expect(html).toContain(`src="/root.png"`);
    expect(html).toContain(`src="data:image/png;base64,AAAA"`);
  });

  test("without a base dir images stay relative", () => {
    expect(render("![a](img.png)")).toContain(`<img src="img.png" alt="a">`);
  });

  test("relative link hrefs point at the source directory", () => {
    const html = render("[note](./nested/other.md)", "/home/me/docs");
    expect(html).toContain(`href="file:///home/me/docs/nested/other.md"`);
  });

  test("absolute, remote, and fragment link hrefs stay untouched", () => {
    const html = render("[a](https://x.com)\n\n[b](/root.md)\n\n[c](#section)", "/home/me/docs");
    expect(html).toContain(`href="https://x.com"`);
    expect(html).toContain(`href="/root.md"`);
    expect(html).toContain(`href="#section"`);
  });

  test("without a base dir links stay relative", () => {
    expect(render("[a](other.md)")).toContain(`href="other.md"`);
  });
});
