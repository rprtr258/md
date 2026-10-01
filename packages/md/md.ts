import {existsSync, readFileSync, statSync} from "node:fs";
import {resolve} from "node:path";
import {unified} from "unified";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkHtml from "remark-html";
import type {Heading, Root, RootContent} from "mdast";

export const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter)
  .use(remarkHtml);

export async function read(file: string): Promise<string> {
  try {
    return file === "-" ? await Bun.stdin.text() : readFileSync(file, "utf8");
  } catch (error) {
    if ((error as {code?: string}).code === "ENOENT") {
      throw new Error(`File not found: ${file}`);
    }
    throw error;
  }
}

export function headingText(node: Heading): string {
  return node.children
    .map(child => (child as {value?: unknown}).value)
    .filter((value): value is string => typeof value === "string")
    .join("");
}

export function* collectLinks(node: Root | RootContent): Generator<{url: string, line: number}> {
  if (node.type === "link" || node.type === "image") {
    yield {url: node.url, line: node.position?.start.line ?? 0};
  }
  if ("children" in node) {
    for (const child of node.children) {
      yield* collectLinks(child);
    }
  }
}

export function frontmatter(source: string, json = false): string | undefined {
  const tree = processor.parse(source);
  const value = tree.children.find(child => child.type === "yaml")?.value;
  if (value === undefined)
    return undefined;

  return json ? JSON.stringify(Bun.YAML.parse(value), null, 2) : value;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

export function toc(source: string): string {
  const tree = processor.parse(source);
  return tree.children.filter(node => node.type === "heading")
    .map(node => "  ".repeat(node.depth - 1) + `- [${headingText(node)}](#${slug(headingText(node))})`)
    .join("\n");
}

export function stats(source: string): string {
  const lines = source.split("\n");
  if (lines.at(-1) === "")
    lines.pop();
  return `lines: ${lines.length}\nloc: ${lines.filter(line => line !== "").length}\nsize: ${humanSize(Buffer.byteLength(source))}`;
}

function humanSize(bytes: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let unit = 0;
  while (bytes >= 1024 && unit < units.length - 1) {
    bytes /= 1024;
    unit++;
  }
  return `${unit === 0 ? bytes : bytes.toFixed(1)} ${units[unit]}`;
}

function normalizeHeading(text: string): string {
  return text.replace(/^#+\s*/, "").trim().toLowerCase();
}

export function section(source: string, heading: string): string {
  const tree = processor.parse(source);
  const lines = source.split("\n");
  const headings = tree.children.filter(node => node.type === "heading");
  const texts = headings.map(node => headingText(node));
  const index = (() => {
    const res = texts.findIndex(text => text === heading);
    if (res !== -1) 
      return res;

    const target = slug(normalizeHeading(heading));
    return texts.map(slug).findIndex(text => text === target);
  })();
  const match = headings[index];
  if (!match?.position) {
    throw new Error(`Heading not found: ${heading}`);
  }
  const next = headings.slice(index + 1).find(node => node.depth <= match.depth);
  const end = next?.position ? next.position.start.line - 1 : lines.length;
  return lines.slice(match.position.start.line - 1, end).join("\n");
}

export async function findFiles(directory: string): Promise<string[]> {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    throw new Error(`Directory not found: ${directory}`);
  }

  const glob = new Bun.Glob("**/*.md");
  return (await Array.fromAsync(glob.scan({onlyFiles: true, cwd: directory})))
    .filter(file => !file.split("/").some(part => ["node_modules", ".git"].includes(part)));
}

export async function list(directory = "."): Promise<void> {
  for (const file of await findFiles(directory)) {
    console.log(file);
  }
}

export function links(source: string): string[] {
  return [...collectLinks(processor.parse(source))].map(({url}) => url);
}

export async function map(directory = ".", titles = false): Promise<void> {
  for (const file of await findFiles(directory)) {
    const headings = processor.parse(await read(resolve(directory, file))).children.filter(node => node.type === "heading");
    if (titles) {
      const heading = headings.find(node => node.depth === 1);
      console.log(heading ? `${file}: ${headingText(heading)}` : file);
    } else {
      console.log(file);
      for (const node of headings) {
        console.log("  ".repeat(node.depth) + headingText(node));
      }
    }
  }
}
