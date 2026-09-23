import {mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {processor} from "./md";

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderFrontmatter(yaml: string): string {
  const data = Bun.YAML.parse(yaml);
  if (typeof data !== "object" || data === null) {
    return `<code>${escape(yaml)}</code>`;
  }
  const rows = Object.entries(data)
    .map(([key, value]) => `<tr><th>${escape(key)}</th><td>${escape(typeof value === "object" && value !== null ? JSON.stringify(value) : String(value))}</td></tr>`)
    .join("");
  return `<table class="frontmatter">${rows}</table>`;
}

export function render(source: string): string {
  // frontmatter shown as a table at the top, separated from the body
  const tree = processor.parse(source);
  const yaml = tree.children.find(child => child.type === "yaml");
  const head = yaml ? `<div class="frontmatter">${renderFrontmatter(yaml.value)}</div>\n<hr>\n` : "";
  const body = yaml?.position ? source.slice(yaml.position.end.offset) : source;
  return `<!doctype html>\n<meta charset="utf-8">\n<style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:.2em .5em;text-align:left}</style>\n${head}${processor.processSync(body)}`;
}

export async function web(source: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "md-web-"));
  const file = join(dir, "index.html");
  await writeFile(file, render(source));
  const openers: Record<string, [string, string[]]> = {
    darwin: ["open", []],
    win32: ["cmd", ["/c", "start", ""]],
    linux: ["xdg-open", []],
  };
  if (process.platform in openers) {
    const [command, prefix] = openers[process.platform]!;
    Bun.spawn([command, ...prefix, file], {stdin: "ignore", stdout: "ignore", stderr: "ignore"});
  } else {
    console.log(`Open ${file}`);
  }
}
