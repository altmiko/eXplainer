import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { matchesKey, replaceTabs, wrapTextWithAnsi } from "@oh-my-pi/pi-tui";

// Resolve from the installed package, not the user's current project.
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_PATH = join(PACKAGE_ROOT, "skills", "explainer", "SKILL.md");
const POLICY = readFileSync(SKILL_PATH, "utf8");

export default function explainer(pi: ExtensionAPI) {
  let mode: 0 | 1 | 2 = 1;
  const status = () => `ex-${mode}`;

  pi.on("session_start", (_event, ctx) => {
    mode = 1;
    ctx.ui.setStatus("explainer", status());
  });
  pi.on("session_switch", (_event, ctx) => {
    mode = 1;
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
      ctx.ui.setStatus("explainer", status());
      ctx.ui.notify(status(), "info");
    },
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
    async execute(_id, { blocks }, signal, _onUpdate, ctx) {
      if (mode === 0 || signal?.aborted) {
        return { content: [{ type: "text", text: "Code review was not opened." }], details: {} };
      }

      const result = await ctx.ui.custom<"completed" | "closed">((tui, theme, _keys, done) => {
        let index = 0;
        let offset = 0;
        let maxOffset = 0;
        const finish = (value: "completed" | "closed") => {
          signal?.removeEventListener("abort", onAbort);
          done(value);
        };
        const onAbort = () => finish("closed");
        signal?.addEventListener("abort", onAbort, { once: true });
        return {
          render(width: number) {
            const block = blocks[index];
            const safe = (text: string) => replaceTabs(text.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ""));
            const wrap = (text: string) => safe(text).split("\n").flatMap(line => wrapTextWithAnsi(line, Math.max(1, width - 2)));
            const lines = [...wrap(block.code), "", ...wrap(block.explanation)];
            const height = Math.max(3, Math.min(18, (process.stdout.rows || 24) - 8));
            maxOffset = Math.max(0, lines.length - height);
            offset = Math.min(offset, maxOffset);
            return [
              ...wrap(`Block ${index + 1}/${blocks.length} - ${block.location}`).map(line => theme.fg("accent", line)),
              ...lines.slice(offset, offset + height),
              ...wrap(`Lines ${offset + 1}-${Math.min(offset + height, lines.length)}/${lines.length} | Enter/right: next | left: previous | up/down: scroll | Esc: close`).map(line => theme.fg("dim", line)),
            ];
          },
          handleInput(data: string) {
            if (matchesKey(data, "escape")) return finish("closed");
            if (matchesKey(data, "enter") || matchesKey(data, "right")) {
              if (index === blocks.length - 1) return finish("completed");
              index++;
              offset = 0;
            } else if (matchesKey(data, "left")) {
              index = Math.max(0, index - 1);
              offset = 0;
            } else if (matchesKey(data, "up")) {
              offset = Math.max(0, offset - 1);
            } else if (matchesKey(data, "down")) {
              offset = Math.min(maxOffset, offset + 1);
            } else {
              return;
            }
            tui.requestRender();
          },
        };
      });

      const text = result === "completed" ? "The user completed the block review."
        : result === "closed" ? "The user closed the block review."
        : "The interactive review was unavailable. Present the code blocks and explanations in the normal response.";
      return { content: [{ type: "text", text }], details: { result } };
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
