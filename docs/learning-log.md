# Learning log

| Date | Concept | File(s) | Debug tip |
| --- | --- | --- | --- |
| 2026-11-18 | Session teaching modes and portable skill | `src/index.ts`, `skills/explainer/SKILL.md` | Run `/explainer` to inspect the current mode. |
| 2026-11-18 | Extension footer status | `src/index.ts` | Change modes with `/explainer 0`, `/explainer 1`, and `/explainer 2` and check the footer. |
| 2026-11-18 | Cycling modes and compact status | `src/index.ts` | Run `/explainer` repeatedly and check the `ex-0`, `ex-1`, and `ex-2` status. |
| 2026-11-18 | Post-implementation block review | `src/index.ts`, `skills/explainer/SKILL.md` | Check `explainer_review` and its panel when a finished code change is not reviewed. |
| 2026-11-19 | Reviewing implementations and snippets | `src/index.ts`, `skills/explainer/SKILL.md` | Check whether the request expects file edits or a standalone example before inspecting the review. |

## 2026-11-18 - Post-implementation block review

The agent completes and verifies the requested change before passing ordered code blocks and explanations to `explainer_review`. The extension presents one block at a time; navigation changes the view, not the implementation. The shared skill instructs the agent to record broader design, data-flow, tradeoff, and debugging notes here.

The handoff is structured rather than parsed from prose, but the agent still chooses the blocks and must copy the final code accurately. If the review does not appear, inspect the active eXplainer mode, whether the agent called `explainer_review`, and whether the OMP client supports interactive custom panels.

## 2026-11-19 - Reviewing implementations and snippets

Implementation requests should produce project file changes, not just a throwaway example. When there is no established language or destination, the agent should ask before making that choice. Explicit requests for an example can be reviewed without file changes: the agent labels the snippet and sends its exact code to the same review tool. These remain instructions, so the agent can still fail to follow them.
