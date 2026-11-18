import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { replaceTabs, wrapTextWithAnsi } from "@oh-my-pi/pi-tui";

// Resolve from the installed package, not the user's current project.
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_PATH = join(PACKAGE_ROOT, "skills", "explainer", "SKILL.md");
const POLICY = readFileSync(SKILL_PATH, "utf8");

type ReviewBlock = { location: string; code: string; explanation: string };
type ReviewDisplay = { block: ReviewBlock; index: number; total: number };

function renderReview(review: ReviewDisplay, theme: { fg: (color: "accent" | "dim", text: string) => string }) {
  return {
    render(width: number) {
      const safe = (text: string) => replaceTabs(text.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ""));
      const wrap = (text: string, available: number) =>
        safe(text).split("\n").flatMap(line => wrapTextWithAnsi(line, Math.max(1, available)));
      const inner = Math.max(1, width - 4);
      return [
        ...wrap(`Block ${review.index + 1}/${review.total} - ${review.block.location}`, width).map(line => theme.fg("accent", line)),
        ...wrap(review.block.code, width),
        theme.fg("accent", "┌─ Explanation"),
        ...wrap(review.block.explanation, inner).map(line => `${theme.fg("accent", "│")} ${line}`),
        theme.fg("accent", "└─"),
        ...wrap("Alt+N: next  Alt+Shift+N: previous", width).map(line => theme.fg("dim", line)),
      ];
    },
  };
}

export default function explainer(pi: ExtensionAPI) {
  let mode: 0 | 1 | 2 = 1;
  let review: { blocks: ReviewBlock[]; index: number } | undefined;
  const status = () => `ex-${mode}`;

  pi.on("session_start", (_event, ctx) => {
    mode = 1;
    review = undefined;
    ctx.ui.setStatus("explainer", status());
  });
  pi.on("session_switch", (_event, ctx) => {
    mode = 1;
    review = undefined;
    ctx.ui.setStatus("explainer", status());
  });

  pi.registerCommand("explainer", {
    description: "Cycle teaching mode or set it directly: /explainer [0|1|2]",
    handler: async (args, ctx) => {
      const value = args.trim();
      if (!value) {
        mode = ((mode + 1) % 3) as 0 | 1 | 2;
      } else if (value === "0" || value === "1" || value === "2") {
        mode = Number(value) as 0 | 1 | 2;
      } else {
        ctx.ui.notify("Usage: /explainer [0|1|2]", "warning");
        return;
      }
      if (mode === 0) review = undefined;
      ctx.ui.setStatus("explainer", status());
      ctx.ui.notify(status(), "info");
    },
  });

  const moveReview = (step: number, ctx: ExtensionContext) => {
    if (!review) return ctx.ui.notify("No active code review.", "info");
    if (!ctx.isIdle()) return ctx.ui.notify("Wait for the agent to finish before navigating the review.", "info");
    const next = review.index + step;
    if (next < 0 || next >= review.blocks.length) {
      return ctx.ui.notify(next < 0 ? "Already at the first block." : "Already at the last block.", "info");
    }
    review.index = next;
    const display: ReviewDisplay = { block: review.blocks[next], index: next, total: review.blocks.length };
    pi.sendMessage({
      customType: "explainer-block",
      content: `Block ${next + 1}/${display.total} - ${display.block.location}\n\n${display.block.code}\n\nExplanation: ${display.block.explanation}`,
      details: display,
      display: true,
    }, { triggerTurn: false });
  };

  pi.registerMessageRenderer("explainer-block", (message, _options, theme) =>
    renderReview(message.details as ReviewDisplay, theme));
  pi.registerShortcut("alt+n", {
    description: "Show the next eXplainer block",
    handler: async ctx => moveReview(1, ctx),
  });
  pi.registerShortcut("alt+shift+n", {
    description: "Show the previous eXplainer block",
    handler: async ctx => moveReview(-1, ctx),
  });
  pi.registerCommand("explainer-next", {
    description: "Show the next eXplainer block",
    handler: async (_args, ctx) => moveReview(1, ctx),
  });
  pi.registerCommand("explainer-previous", {
    description: "Show the previous eXplainer block",
    handler: async (_args, ctx) => moveReview(-1, ctx),
  });

  const z = pi.zod;
  pi.registerTool({
    name: "explainer_review",
    label: "Code review",
    description: "Present implemented or explicitly requested example code as ordered blocks followed by explanations.",
    loadMode: "essential",
    approval: "read",
    parameters: z.object({
      blocks: z.array(z.object({
        location: z.string().describe("File path and line range, or a label for an example snippet"),
        code: z.string().describe("Exact code from the finished implementation or requested example"),
        explanation: z.string().describe("Explanation of this code block"),
      })).min(1).describe("Code blocks in the order the user should review them"),
    }),
    async execute(_id, { blocks }, signal) {
      if (mode === 0 || signal?.aborted) {
        return { content: [{ type: "text", text: "Code review was not opened." }], details: {} };
      }
      review = { blocks, index: 0 };
      const display: ReviewDisplay = { block: blocks[0], index: 0, total: blocks.length };
      const text = blocks.map((block, index) =>
        `Block ${index + 1}/${blocks.length} - ${block.location}\n${block.code}\nExplanation: ${block.explanation}`,
      ).join("\n\n");
      return {
        content: [{ type: "text", text: `Inline review started. Do not repeat the blocks in your final response.\n\n${text}` }],
        details: { review: display },
      };
    },
    renderResult(result, _options, theme) {
      const display = (result.details as { review?: ReviewDisplay } | undefined)?.review;
      return display ? renderReview(display, theme) : { render: () => [] };
    },
  });

  pi.on("before_agent_start", (event) => {
    if (mode === 0) return;
    const detail = mode === 2
      ? "\nUse detailed explanations: expand the five sections with examples, tradeoffs, and debugging guidance when relevant."
      : "\nUse base explanations and the concise guidance in this skill.";
    const review = "\nAfter completing and verifying a coding request, call explainer_review exactly once with every relevant changed code block copied from the final files and an explanation for each, in runtime order. Include file paths and line ranges. If the user asks for code as an answer without file changes, review the exact example code instead and label it as a snippet. Mode 1 explanations are concise; mode 2 explanations include relevant detail and examples. The review happens after all edits, not between them. Do not call it when asking for missing information or for requests without code.";
    const block = `<explainer>\n${POLICY}${detail}${review}\n</explainer>`;
    if (Array.isArray(event.systemPrompt)) {
      return { systemPrompt: [...event.systemPrompt, block] };
    }
    if (typeof event.systemPrompt === "string") {
      return { systemPrompt: `${event.systemPrompt}\n\n${block}` };
    }
    // Leave undefined prompts alone rather than breaking the agent.
  });

  pi.registerCommand("debug-map", {
    description: "Trace a feature end-to-end without modifying the project: /debug-map <feature>",
    handler: async (args, ctx) => {
      const feature = args.trim();
      if (!feature) {
        ctx.ui.notify("Usage: /debug-map <feature>", "warning");
        return;
      }
      pi.sendUserMessage(
        `READ-ONLY DEBUG MAP for: ${feature}\n` +
        `Inspect repository files and trace the entry point, functions, data flow, ` +
        `state/persistence, failure symptoms, and where to place logs/breakpoints. ` +
        `Do not edit files, install dependencies, or execute mutating commands. ` +
        `Do not update docs/learning-log.md. Identify uncertain links.`
      );
    },
  });
}
