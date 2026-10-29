import {describe, expect, test} from "bun:test";
import {render} from "@rprtr258/md-common/web.ts";

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
});
