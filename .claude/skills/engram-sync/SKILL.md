---
name: engram-sync
description: >
  Import Engram memories from the repo when setting up on a new machine.
  Trigger: When user sets up the project on a new machine, says "setup engram",
  "import memories", "new machine", "otra computadora", "laptop nueva", or
  when .claude/engram-export.json exists but memories seem empty.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- User is setting up the project on a new machine for the first time
- Engram memories seem empty or missing context from previous sessions
- User mentions switching computers or cloning the repo fresh
- `.claude/engram-export.json` exists in the repo

## Critical Patterns

**Export is automatic** — a pre-commit git hook (`.githooks/pre-commit`) exports
memories to `.claude/engram-export.json` before every commit. The file travels
with the repo automatically.

**Import is manual once per machine** — must be run after cloning on a new machine.

**Git hooks require one-time activation per machine:**
```bash
git config core.hooksPath .githooks
```
Without this, the pre-commit hook won't run and memories won't be exported on that machine.

## Commands

```bash
# ── NEW MACHINE SETUP (run once after cloning) ──────────────────
# 1. Activate git hooks so future commits auto-export memories
git config core.hooksPath .githooks

# 2. Import existing memories from the repo
engram import .claude/engram-export.json

# ── MANUAL EXPORT (if needed outside a commit) ──────────────────
engram export .claude/engram-export.json
git add .claude/engram-export.json
git commit -m "chore: sync engram memories"

# ── VERIFY IMPORT WORKED ────────────────────────────────────────
engram context
engram stats
```

## Setup Checklist (new machine)

- [ ] `git config core.hooksPath .githooks` — activates pre-commit export
- [ ] `engram import .claude/engram-export.json` — loads all memories
- [ ] Verify with `engram context` — should show recent session history
