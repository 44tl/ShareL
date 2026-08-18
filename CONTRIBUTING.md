# Contributing to ShareL

Thank you for your interest in contributing to ShareL. Please read these
guidelines carefully before opening a pull request or proposing changes.

---

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies and build the app:

   ```bash
   pnpm install
   pnpm tauri dev
   ```

3. Run the installer in a clean environment to validate the full build path:

   ```bash
   ./install.sh --no-deps
   ```

ShareL is built for Linux Wayland sessions. Test under a real compositor
(Niri, Hyprland, Sway, GNOME, KDE, or COSMIC), not under X11 or a headless
session.

---

## Core Guidelines and Standards

### 1. No Code Comments Policy

* **Strip all comments before committing.** Code must be clean, concise,
  self-documenting, and readable without inline narratives or restatements of
  what the code does.
* **The ONLY exception:** You may leave a comment strictly if you are flagging a
  genuine edge-case, known upstream limitation, or bug that you want other
  developers to investigate and fix (e.g. `TODO: upstream ashpd issue #123`).
* Do not submit commented-out code, debug `println!` statements, or dead
  scaffolding.
* This policy applies to code comments only. Markdown documentation
  (`README.md`, `SECURITY.md`, this file) is exempt, but keep it free of
  em-dashes and consistent in structure.

### 2. No AI Slop

* If you use AI tools as a development aid, you are solely responsible for
  understanding, validating, and testing every line of code you submit.
* Do **NOT** dump raw, unverified AI outputs, boilerplate wrappers, fabricated
  mocks, or hallucinated APIs into this repository.
* Every contribution must be thoughtful, robust, minimal, and battle-tested on
  real Linux desktop sessions.

### 3. Solve Real, Universal Problems

* Only fix or change something if it is truly broken or missing for all users
  and distributions, not just a quirk of your personal ephemeral setup.
* Avoid gratuitous refactorings or stylistic churn that provides zero
  performance or functional benefit.
* Keep pull requests focused on a single feature, bug fix, or performance
  optimization.

### 4. Wayland-First Architecture

* ShareL is built specifically for Linux Wayland environments.
* When adding compositor or backend features, ensure they respect the backend
  hierarchy:
  1. `XDG Desktop Portal` (Standard cross-desktop API)
  2. `grim / slurp` (Direct Wayland screencopy)
  3. `gpu-screen-recorder` / `wf-recorder` (Hardware-accelerated and
     screencopy recording)
  4. Native compositor IPC (`niri`, `hyprctl`, `swaymsg`, etc.)
* Never introduce X11-only dependencies or hardcoded desktop environment
  assumptions without proper fallbacks.

---

## Commit Messages

Use the conventional-commit format:

```
<type>(<scope>): <subject>
```

* **Types:** `feat`, `fix`, `perf`, `docs`, `chore`, `security`, `refactor`
* **Scope (optional):** the affected module, e.g. `(recorder)`, `(uploader)`.
* **Subject:** a short imperative summary, e.g. `enforce wayland backend
  validation and add sigkill escalation`.

Wrap the body at 72 characters. Reference issues with `#123`.

---

## Pull Request Process

1. Create a feature branch from `main`.
2. Make focused changes. One PR per logical change.
3. Run the verification checklist below.
4. Open the PR with a summary of the change, the reasoning, and any manual
   testing notes.

### Verification Checklist Before Submitting PR

1. Run `cargo check` and `cargo test` in `src-tauri/` to verify Rust code
   quality and compilation.
2. Run `pnpm build` (`tsc && vite build`) to ensure frontend TypeScript types
   and bundles compile cleanly with zero errors.
3. Strip any temporary comments or debug logs.
4. Verify functionality locally under your Wayland compositor (Niri, Hyprland,
   Sway, GNOME, KDE, or COSMIC).

### Testing Notes

* Rust unit tests live alongside the code in `src-tauri/src/`. Add a test for
  any new behavior that is pure and deterministic.
* Do not commit credentials, mock API keys, or credential-shaped strings. Use
  neutral placeholders like `example.com` in test fixtures and fallbacks.
* Run `./install.sh --no-deps` on a clean checkout to confirm the installer
  still produces a working binary.