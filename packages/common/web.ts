import {copyFile, mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawn} from "node:child_process";
import {parse as yamlParse} from "yaml";
import type {Heading} from "mdast";
import {headingText, processor} from "./md.ts";

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

// light + dark token colors for the hljs classes emitted by rehype-highlight
const css = `
:root{--bg:#fff;--fg:#1f2328;--muted:#59636e;--border:#d1d9e0;--code-bg:#f6f8fa;--accent:#0969da;--kw:#cf222e;--str:#0a3069;--cmt:#6e7781;--num:#0550ae;--fn:#8250df}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#9198a1;--border:#30363d;--code-bg:#161b22;--accent:#4493f8;--kw:#ff7b72;--str:#a5d6ff;--cmt:#8b949e;--num:#79c0ff;--fn:#d2a8ff}}
*{box-sizing:border-box}
body{margin:0 auto;max-width:80rem;padding:2rem 2rem 6rem;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--fg);background:var(--bg)}
h1,h2,h3,h4,h5,h6{margin:1.6em 0 .6em;line-height:1.3;font-weight:650}
h1,h2{border-bottom:1px solid var(--border);padding-bottom:.3em}
p,ul,ol,blockquote,table,pre{margin:.8em 0}
ul,ol{padding-left:1.5em}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
img,video{max-width:100%}
blockquote{padding:.1em 1em;border-left:.25em solid var(--border);color:var(--muted)}
hr{border:0;border-top:1px solid var(--border);margin:2em 0}
table{border-collapse:collapse;display:block;max-width:100%;overflow:auto}
th,td{border:1px solid var(--border);padding:.35em .6em;text-align:left}
thead th{background:var(--code-bg)}
code{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:.875em;background:var(--code-bg);border-radius:5px;padding:.15em .35em}
pre{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:.9em 1.1em;overflow-x:auto;line-height:1.55}
pre code{display:block;background:none;padding:0;font-size:.85em}
li:has(>input[type=checkbox]){list-style:none;margin-left:-1.3em}
.frontmatter{border:1px solid var(--border);border-radius:8px;padding:.4em .75em;margin:0 0 1.5em;font-size:.85em;color:var(--muted)}
.frontmatter table{display:table;margin:0}
.frontmatter th,.frontmatter td{border:0;padding:.1em 1em .1em 0}
.hljs{color:var(--fg)}
.hljs-comment,.hljs-quote{color:var(--cmt);font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-doctag,.hljs-name,.hljs-tag{color:var(--kw)}
.hljs-string,.hljs-regexp,.hljs-symbol,.hljs-bullet,.hljs-addition,.hljs-meta .hljs-string{color:var(--str)}
.hljs-number,.hljs-literal,.hljs-attr,.hljs-attribute,.hljs-selector-id,.hljs-selector-class,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-section,.hljs-variable,.hljs-template-variable{color:var(--num)}
.hljs-title,.hljs-function,.hljs-built_in,.hljs-type,.hljs-class{color:var(--fn)}
.hljs-emphasis{font-style:italic}
.hljs-strong{font-weight:600}
pre.mermaid{overflow:hidden;cursor:grab;touch-action:none;user-select:none}
pre.mermaid:active{cursor:grabbing}
`;

// mermaid diagrams render client-side, always dark theme; the vendored script is copied next to index.html by web()
// pane: wheel = zoom at cursor, drag = pan, double-click = reset; bright fills (notes etc) are inverted for dark mode
const mermaidScript = `<script src="./mermaid.min.js"></script>\n<script>mermaid.initialize({startOnLoad:false,theme:"dark"});addEventListener("DOMContentLoaded",async()=>{await mermaid.run();for(const rect of document.querySelectorAll("pre.mermaid rect")){const m=getComputedStyle(rect).fill.match(/[\\d.]+/g);if(m&&m.length>2&&(0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255>.5)rect.style.filter="invert(1)"}for(const pre of document.querySelectorAll("pre.mermaid")){const svg=pre.querySelector("svg");if(!svg)continue;svg.style.transformOrigin="0 0";let s=1,x=0,y=0;const apply=()=>svg.style.transform=\`translate(\${x}px,\${y}px) scale(\${s})\`;const r=()=>pre.getBoundingClientRect(),L=pre.clientLeft+parseFloat(getComputedStyle(pre).paddingLeft),T=pre.clientTop+parseFloat(getComputedStyle(pre).paddingTop);pre.addEventListener("wheel",e=>{e.preventDefault();const f=e.deltaY<0?1.1:1/1.1;if(s*f<.1||s*f>20)return;const b=r(),px=e.clientX-b.left-L,py=e.clientY-b.top-T;x=px-(px-x)*f;y=py-(py-y)*f;s*=f;apply()},{passive:false});let ox=0,oy=0,down=false;pre.addEventListener("pointerdown",e=>{down=true;ox=e.clientX-x;oy=e.clientY-y;pre.setPointerCapture(e.pointerId)});pre.addEventListener("pointermove",e=>{if(down){x=e.clientX-ox;y=e.clientY-oy;apply()}});pre.addEventListener("pointerup",()=>down=false);pre.addEventListener("pointercancel",()=>down=false);pre.addEventListener("dblclick",()=>{s=1;x=0;y=0;apply()})}})</script>\n`;

export function render(source: string): string {
  // frontmatter shown as a table at the top, separated from the body
  const tree = processor.parse(source);
  const yaml = tree.children.find(child => child.type === "yaml");
  const head = yaml ? `<div class="frontmatter">${renderFrontmatter(yaml.value)}</div>\n<hr>\n` : "";
  const body = yaml?.position ? source.slice(yaml.position.end.offset) : source;
  const title = tree.children.find((child): child is Heading => child.type === "heading" && child.depth === 1);
  const html = processor.processSync(body).toString()
    .replaceAll(/<pre><code class="language-mermaid[^\"]*">([\s\S]*?)<\/code><\/pre>/g, '<pre class="mermaid">$1</pre>');
  return `<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escape(title ? headingText(title).trim() : "markdown")}</title>\n<style>${css}</style>\n${head}${html}${html.includes('<pre class="mermaid">') ? mermaidScript : ""}`;
}

export async function web(source: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "md-web-"));
  const file = join(dir, "index.html");
  const html = render(source);
  await writeFile(file, html);
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
    spawn(command, [...prefix, file], {stdio: "ignore", detached: true}).unref();
  } else {
    console.log(`Open ${file}`);
  }
}
