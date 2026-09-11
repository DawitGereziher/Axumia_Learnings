# Context & Usage Minimization Rules — Codebase Analysis Mode

Purpose: cut token/context usage during codebase understanding and analysis tasks.
Core idea: **never load more than you need, never load it twice.**

---

## Rule 1 — Structure before content
Before reading any file's contents, get its **shape** first:
- File tree / directory listing instead of opening every file
- Function/class signatures, imports, and exports instead of full file bodies
- Only open a file's full content when you need to *edit* it or answer a question that structure alone can't answer

❌ Don't: open 15 files to "see how the module works"
✅ Do: list the files, skim signatures/docstrings, open only the 1-2 files that actually answer the question

## Rule 2 — Search, don't scan
Never read a whole file (or worse, a whole directory) to find one thing.
- Use grep/ripgrep-style search for exact strings, function names, or patterns
- Use a symbol index or code-graph tool if available (call graph, "who calls this", "what does this import") instead of manually tracing through files
- Only fall back to full-file reads when search comes back empty or ambiguous

## Rule 3 — Summarize once, reuse forever
The first time you understand a module/file/system, **write down what you learned** in a short persistent note (a scratch doc, comment, or index file) — not just in your head/session.
- Next time you or a teammate needs that context, read the *summary* first
- Only re-read the source if the summary is missing, stale, or insufficient
- This turns "re-discover the codebase every session" into "read one paragraph"

## Rule 4 — Process big outputs outside the conversation
If a command, log, test run, or file is going to produce more than ~20-30 lines of output:
- Run it in a way that lets you filter/count/extract just the answer (script, `grep`, `wc -l`, `jq`, etc.)
- Only bring the final number/line/answer back into the conversation
- Never paste raw dumps "just in case" — pull the specific fact you need

## Rule 5 — Scope every question tightly
Before asking an open-ended question ("how does auth work in this app?"), narrow it:
- Which file/module is likely responsible? (check the tree/structure first)
- What's the specific behavior you need to understand? (one flow, not the whole system)
- Ask "where is X defined and what calls it" instead of "explain this codebase"

Narrow questions get narrow (cheap) answers. Broad questions get expensive, sprawling ones.

## Rule 6 — Batch related lookups
If you have multiple related questions (e.g., "where's the login function, where's the token refresh, where's the session check"), ask them **together in one pass** rather than one at a time — most search/analysis tools support multiple queries per call, and batching avoids repeated overhead per question.

## Rule 7 — Don't re-explain what's already been established
Once a fact about the codebase has been confirmed in this session (e.g., "auth uses JWT stored in localStorage"), treat it as known. Don't re-derive or re-read the source to re-confirm it unless something suggests it's changed.

---

## Quick self-check before any action
Ask:
1. Do I need the *whole file*, or just its structure/signature?
2. Has this already been answered earlier in this session?
3. Can I get the answer via search/grep instead of reading everything?
4. Is this output going to be long? If so, can I filter it down before it enters context?

If the answer to any of these suggests a shortcut exists — take it.

---

## Realistic expectation
These rules target the actual biggest cost driver for analysis work: **loading more raw content than the question requires.** For heavy "understand this codebase" work, following them consistently typically cuts usage substantially — but the exact percentage depends on how much you were over-reading before, and how disciplined you are about scoping questions. Treat "half" as a reasonable target, not a guarantee — measure your own before/after if your tool reports usage stats.
