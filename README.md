# eXplainer - Oh My Pi extension

An opt-in mentoring mode for [Oh My Pi](https://github.com/can1357/oh-my-pi): the agent asks about meaningful design choices, writes the implementation, explains the important code, records learning notes, and offers a read-only `/debug-map` command.

## Install

After publishing to npm:

```powershell
omp plugin install explainer
```

Restart OMP, then ask it to build a small feature. For example: `Add a papers table and migration, and ask me about meaningful schema decisions before editing.`

Use `/debug-map health endpoint` to inspect a feature without changing source files.

## Local development on Windows / PowerShell

From this repository:

```powershell
omp plugin link .
```

Restart OMP and test the sample task and `/debug-map`. If your installed OMP version does not support `plugin link`, use `omp --extension .\src\index.ts` from the repository directory.

## What it does

- Injects `rules/mentor.md` into the agent prompt before turns, independent of the current working directory.
- Asks 2–4 options only for consequential decisions and waits for the choice before editing that slice.
- Explains each implementation slice as What / Why / How / Breaks / Debug (target: 160 words max).
- Instructs the agent to append a concise row to `docs/learning-log.md` after completed implementation slices.
- Adds the read-only-by-instruction `/debug-map <feature>` command.

**Note:** Approval gates and read-only behavior are prompt instructions, not a security sandbox. The extension does not physically block file-write tools. Test it before use on valuable repositories.

## Publish to npm

1. Check that the npm package name `explainer` is available.
2. Push the repository to GitHub and create an npm account.
3. From this directory run:

```powershell
npm pack --dry-run
npm login
npm publish --access public
```

4. Verify on another machine: `omp plugin install explainer`.

Increment `version` for each npm update (for example `npm version patch`) and publish again.

## License

MIT
