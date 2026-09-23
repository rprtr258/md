import {describe, expect, test} from "bun:test";
import {render} from "./web.ts";

describe("render", () => {
  test.each([
    ["frontmatter as table above the body", "---\ntitle: x\ntags:\n  - a\n  - b\nmeta:\n  y: 1\n---\n\n# Hello\n\n**world**\n"],
    ["no frontmatter has no separator", "# Hello\n"],
    ["non-object frontmatter as raw code", "---\njust a string\n---\n\n# Hello\n"],
  ])("%s", (_name, input) => {
    expect(render(input)).toMatchSnapshot();
  });
});
