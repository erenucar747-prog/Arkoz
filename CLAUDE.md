# CLAUDE.md — AI Assistant Guide for Arkoz

This file provides context and conventions for AI assistants (Claude Code and similar tools) working in this repository.

## Project Overview

**Arkoz** is a project currently in its initial phase. The repository was created on 2026-03-12 and contains only a placeholder README at this time. This document will evolve as the codebase grows.

## Repository State

- **Status:** Newly initialized — no source code, dependencies, tests, or build configuration yet
- **Single commit:** `8e6e93d` — Initial commit (README.md only)
- **Primary branches:**
  - `master` — default branch
  - `origin/main` — remote default

## Development Branch Convention

When working on features or fixes via Claude Code:
- Branches follow the pattern `claude/<description>-<SESSION_ID>`
- Always push to the designated feature branch, never directly to `master` or `main`
- Use `git push -u origin <branch-name>`

## Git Workflow

```bash
# Create and switch to a feature branch
git checkout -b claude/<description>-<SESSION_ID>

# Stage specific files (avoid git add -A to prevent accidental inclusion of secrets)
git add <file1> <file2>

# Commit with a descriptive message
git commit -m "feat: describe what was added and why"

# Push to remote
git push -u origin claude/<description>-<SESSION_ID>
```

### Commit Message Style

Follow conventional commits:

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring without behavior change |
| `test:` | Adding or updating tests |
| `chore:` | Build process, tooling, dependency updates |

## File & Directory Conventions

As the project grows, follow these conventions:

- **Source code:** Place in `src/` or a language-appropriate directory
- **Tests:** Mirror source structure under `tests/` or `__tests__/`
- **Configuration:** Keep at the repo root (`.eslintrc`, `pyproject.toml`, etc.)
- **Documentation:** Place in `docs/` for anything beyond README/CLAUDE.md
- **Scripts:** Place automation scripts in `scripts/`

## Security Guidelines

- Never commit secrets, credentials, API keys, or `.env` files
- Validate all external input at system boundaries
- Avoid introducing OWASP Top 10 vulnerabilities (SQLi, XSS, command injection, etc.)
- Do not bypass git hooks with `--no-verify`

## AI Assistant Instructions

When working in this repository:

1. **Read before editing** — Always read a file before modifying it
2. **Minimal changes** — Only change what is directly requested; avoid scope creep
3. **No unnecessary files** — Do not create files unless strictly required
4. **No unsolicited cleanup** — Do not refactor, add comments, or improve code beyond the task
5. **Ask before destructive actions** — Confirm before deleting files, force-pushing, or resetting history
6. **Update this file** — When significant new structure or conventions are established, update CLAUDE.md to reflect the current state

## Updating This Document

This file should be updated when:
- A programming language / framework is chosen
- A package manager and dependencies are added
- A build system or test runner is configured
- CI/CD pipelines are established
- Coding style or lint rules are set up
- Database or API conventions are defined
