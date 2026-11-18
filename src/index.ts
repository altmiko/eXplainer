import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

  pi.on("before_agent_start", (event) => {
    if (mode === 0) return;
    const detail = mode === 2
      ? "\nUse detailed explanations: expand the five sections with examples, tradeoffs, and debugging guidance when relevant."
      : "\nUse base explanations and the concise guidance in this skill.";
    const block = `<explainer>\n${POLICY}${detail}\n</explainer>`;
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
