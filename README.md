# eXplainer - Oh My Pi extension

An opt-in mentoring mode for [Oh My Pi](https://github.com/can1357/oh-my-pi): the agent asks about meaningful design choices, writes the implementation, explains the important code, records learning notes, and offers a read-only `/debug-map` command.

## Install

```powershell
omp plugin install @1miko/explainer
```

Restart OMP after installing the plugin.

## Usage

Start OMP in the project you want to work on. eXplainer starts in mode 1 and applies its mentoring instructions automatically.

Enter `/explainer` to cycle through modes 1 → 2 → 0 → 1, or use `/explainer 0`, `/explainer 1`, or `/explainer 2` to select one directly:

| Mode | Behavior |
| --- | --- |
| 0 | No automatic mentoring prompt injection. |
| 1 | Base mentoring with concise explanations (default). |
| 2 | Detailed explanations with relevant examples, tradeoffs, and debugging guidance. |

The OMP footer shows `ex-0`, `ex-1`, or `ex-2` beneath the editor. The mode resets to 1 when starting or switching sessions. Changes affect subsequent prompts; prior conversation history remains. Custom OMP status-line settings can hide extension statuses.

For on-demand learning in any mode, invoke `/skill:explainer` with your question, for example:

```text
/skill:explainer Explain how this request reaches the database.
```

The skill remains available in mode 0, as does `/debug-map`; the agent may also select available skills automatically. The skill can be copied from `skills/explainer/` into a compatible agent's skills directory. Invocation syntax and discovery rules depend on the agent.

Ask for a change as usual, for example:

```text
Add a papers table and migration, and ask me about meaningful schema decisions before editing.
```

For consequential design choices, the agent presents options and waits for your choice. It then completes and verifies the change before opening a review of the relevant code blocks. Each block is followed by its explanation; mode 1 is concise and mode 2 adds detail.

In the review panel, press Enter or Right for the next block, Left for the previous block, Up or Down to scroll, and Esc to close. Advancing does not make edits: the implementation is already complete. If an interactive panel is unavailable, the agent is instructed to present the blocks in the normal response instead.

The agent also records broader design, data-flow, tradeoff, and debugging notes in the project's `docs/learning-log.md`. The review and notes depend on the agent following the plugin's instructions.

To trace an existing feature without changing the project, enter `/debug-map` followed by the feature name in OMP:

```text
/debug-map health endpoint
```

The agent traces the entry point, data flow, state, failure paths, and useful debugging locations. Replace `health endpoint` with the feature you want to inspect.

## What it does

- Applies the shared `skills/explainer/SKILL.md` instructions according to the current mode.
- Asks 2–4 options only for consequential decisions and waits for the choice before editing that slice.
- Explains implementation slices as What / Why / How / Breaks / Debug, concisely in mode 1 or in more detail in mode 2.
- Instructs the agent to append a learning-log row and broader explanation after completed implementation slices.
- Adds the read-only-by-instruction `/debug-map <feature>` command.

**Note:** Approval gates and read-only behavior are prompt instructions, not a security sandbox. The extension does not physically block file-write tools. Test it before use on valuable repositories.

## License

MIT
