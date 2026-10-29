import {copyFile, mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {spawn} from "node:child_process";
import {parse as yamlParse} from "yaml";
import type {Transformer} from "unified";
import type {Heading} from "mdast";
import {headingText, processor} from "./md.ts";
// light + dark token colors for the hljs classes emitted by rehype-highlight
import css from "./web.css" with { type: "text" };
// mermaid diagrams render client-side, always dark theme; the vendored script is copied next to index.html by web()
// pane: wheel = zoom at cursor, drag = pan, double-click = reset; bright fills (notes etc) are inverted for dark mode
import mermaidScript from "./web.mermaid.html" with { type: "text" };

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderFrontmatter(yaml: string): string {
  const data = yamlParse(yaml);
  if (typeof data !== "object" || data === null) {
    return `<code>${escape(yaml)}</code>`;
  }
  const rows = Object.entries(data)
    .map(([key, value]) => `<tr><th>${escape(key)}</th><td>${escape(typeof value === "object" && value !== null ? JSON.stringify(value) : String(value))}</td></tr>`)
    .join("");
  return `<table class="frontmatter">${rows}</table>`;
}

// relative image srcs and link hrefs would resolve against the temp dir the html lives in; rewrite them to point at the source dir instead
function resolveRelativePaths(baseDir: string): Transformer {
  return tree => {
    walkResources(tree, baseDir);
  };
}

function walkResources(node: unknown, baseDir: string): void {
  if (typeof node !== "object" || node === null)
    return;
  const {tagName, properties, children} = node as {tagName?: unknown, properties?: Record<string, unknown>, children?: unknown[]};
  const attr = tagName === "img" ? "src" : tagName === "a" ? "href" : undefined;
  if (attr !== undefined && properties !== undefined && typeof properties[attr] === "string") {
    properties[attr] = fileUrl(properties[attr] as string, baseDir);
  }
  if (children !== undefined) {
    for (const child of children)
      walkResources(child, baseDir);
  }
}

function fileUrl(url: string, baseDir: string): string {
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url) || url.startsWith("/") || url.startsWith("#")) return url;
  // characters like spaces arrive percent-encoded from the markdown parser; decode them back before building the file url
  let path = url;
  try {
    path = decodeURIComponent(url);
  } catch {
    // stray percent sign, not a valid escape: keep the raw string
  }
  return pathToFileURL(resolve(baseDir, path)).href;
}

export function render(source: string, baseDir?: string): string {
  // frontmatter shown as a table at the top, separated from the body
  const tree = processor.parse(source);
  const yaml = tree.children.find(child => child.type === "yaml");
  const head = yaml ? `<div class="frontmatter">${renderFrontmatter(yaml.value)}</div>\n<hr>\n` : "";
  const body = yaml?.position ? source.slice(yaml.position.end.offset) : source;
  const title = tree.children.find((child): child is Heading => child.type === "heading" && child.depth === 1);
  const p = baseDir === undefined ? processor : processor().use(() => resolveRelativePaths(baseDir));
  const html = p.processSync(body).toString()
    .replaceAll(/<pre><code class="language-mermaid[^\"]*">([\s\S]*?)<\/code><\/pre>/g, '<pre class="mermaid">$1</pre>');
  return `<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escape(title ? headingText(title).trim() : "markdown")}</title>\n<style>${css}</style>\n${head}${html}${html.includes('<pre class="mermaid">') ? mermaidScript : ""}`;
}

export async function web(source: string, file?: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "md-web-"));
  const htmlFile = join(dir, "index.html");
  const html = render(source, file === undefined ? undefined : dirname(file));
  await writeFile(htmlFile, html);
  if (html.includes('<script src="./mermaid.min.js">')) {
    await copyFile(new URL("./vendor/mermaid.min.js", import.meta.url), join(dir, "mermaid.min.js"));
  }
  const openers: Record<string, [string, string[]]> = {
    darwin: ["open", []],
    win32: ["cmd", ["/c", "start", ""]],
    linux: ["xdg-open", []],
  };
  if (process.platform in openers) {
    const [command, prefix] = openers[process.platform]!;
    spawn(command, [...prefix, htmlFile], {stdio: "ignore", detached: true}).unref();
  } else {
    console.log(`Open ${htmlFile}`);
  }
}
