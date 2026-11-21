import type {Linter, Rule} from "eslint";
import {join, relative} from "node:path";

// comment-hygiene — comments and prose must describe the present. Flags
// history narration: dead provenance (ports, removed backends, predecessor
// implementations), dangling off-repo decision-log labels, and resolved-
// transition wording (past-habit narration of replaced behavior). Git
// history is the archive; a flagged line should say what IS true instead.
// On code files only comment lines are scanned (the pattern table below
// lives in code and must not self-match); on markdown ({prose: true}) the
// whole file is prose. Known current-state false positives go in ALLOW,
// keyed by repo-relative path.
const PATTERNS: Record<string, RegExp> = {
  "removed-backend / provenance narration": /pre-IR|star\.ink|old-syntax|old bump|old per-item|old rest-of|old frame snap|old 4-word|old linear|old timeout|formerly|\.ml sources/i,
  "off-repo plan label": /typed-widths|slices plan|batch A|\bsteps? [0-9]/i,
  "off-repo decision label": /\bD7\b/,
  "resolved-transition wording": /\bno longer\b|\bused to\b(?! warn\b)/i,
};

const ALLOW: Record<string, string[] | undefined> = {
  // lexer rule-table rows, not plan phases
  "docs/content/dev/lexer.md": ["step 4/5"],
  // plan document's own step headings; a plan's self-indexing is not history narration
  "plans/2026-11-12-selective-cps-v1.md": ["Step 1", "Step 2", "Step 3", "Steps 1", "step 1", "step 2", "step 3"],
};

// Repo root: this file lives at <root>/eslint/rules/.
const ROOT = join(import.meta.dirname, "..", "..");

export const commentHygiene: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {description: "flags history-narration comments and prose"},
    schema: [{type: "object", properties: {prose: {type: "boolean"}}, additionalProperties: false}],
    messages: {
      narration: "History narration (\"{{match}}\" — {{kind}}): state what is true; git history is the archive.",
    },
  },
  create(context) {
    const prose = (context.options[0] as {prose?: boolean} | undefined)?.prose === true;
    return {
      Program(node) {
        const src = context.sourceCode;
        const allowed = ALLOW[relative(ROOT, context.filename)];
        const lines = src.text.split("\n");
        const commentLines = new Set<number>();
        if (!prose) {
          for (const c of src.getAllComments()) {
            if (c.loc === undefined || c.loc === null) continue;
            for (let l = c.loc.start.line; l <= c.loc.end.line; l++) commentLines.add(l);
          }
        }
        for (const [i, line] of lines.entries()) {
          if (!prose && !commentLines.has(i + 1)) continue;
          if (allowed !== undefined && allowed.some((s) => line.includes(s))) continue;
          for (const [kind, m] of Object.entries(PATTERNS).flatMap(([kind, re]) => {
            const m = line.match(re);
            return m === null ? [] : [[kind, m] as const];
          })) {
            context.report({
              node,
              loc: {line: i + 1, column: m.index ?? 0},
              messageId: "narration",
              data: {match: m[0], kind},
            });
          }
        }
      },
    };
  },
};

// Minimal parser for markdown (and any prose): eslint traverses an empty
// Program, so only Program-visitor rules run — comment-hygiene reads the raw
// text via sourceCode.text and reports with computed locations.
export const mdParser: Linter.NonESTreeParser = {
  meta: {name: "md-noop-parser"},
  parseForESLint(code: string) {
    const lines = code.split("\n");
    const last = lines[lines.length - 1] ?? "";
    const ast = {
      type: "Program",
      start: 0,
      end: code.length,
      loc: {start: {line: 1, column: 0}, end: {line: lines.length, column: last.length}},
      range: [0, code.length] as [number, number],
      body: [],
      tokens: [],
      comments: [],
      sourceType: "module",
    };
    return {ast};
  },
};
