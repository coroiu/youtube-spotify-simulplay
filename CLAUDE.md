# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Planning Mode

**When in planning mode**, do NOT implement features directly from the plan. Instead:

1. Break the plan into discrete tasks and file each as a beads issue: `bd file --title "..." --body "..."`
2. Exit plan mode — the plan itself is NOT the deliverable, the beads issues are
3. Work is then picked up via `bd ready` in a normal implementation session

This ensures all work is tracked, reviewable, and can be handed off between sessions.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Committing During Implementation

Commit **early and often** — small, focused commits make history easy to review and changes easy to revert.

**RULES:**
- Commit after each logical unit of work (a single function, a bug fix, a config change) — don't batch unrelated changes
- Each commit should do one thing and be described in one short sentence
- Never accumulate a large diff before committing — if `git diff` is getting long, commit what's done first
- Commit before switching to a different part of the codebase

**BAD:** one commit with "implement feature X" touching 20 files
**GOOD:** a chain of commits like:
- `add Route model`
- `wire up Route to database`
- `add Route API endpoint`
- `add tests for Route endpoint`

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

