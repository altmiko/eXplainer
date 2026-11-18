import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve from the installed package, not the user's current project.
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POLICY_PATH = join(PACKAGE_ROOT, "rules", "mentor.md");
const POLICY = readFileSync(POLICY_PATH, "utf8");

export default function explainer(pi: ExtensionAPI) {
  pi.on("before_agent_start", (event) => {
    // OMP commonly supplies systemPrompt as an array of prompt blocks.
    const block = `<explainer>\n${POLICY}\n</explainer>`;
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
