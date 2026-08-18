# Contributing to ShareL

Thank you for your interest in contributing to ShareL. Please read these guidelines carefully before opening a pull request or proposing changes.

---

## Core Guidelines & Standards

### 1. No Code Comments Policy
* **Strip all comments before committing.** Code must be clean, concise, self-documenting, and readable without inline narratives or restatements of what the code does.
* **The ONLY exception:** You may leave a comment strictly if you are flagging a genuine edge-case, known upstream limitation, or bug that you want other developers to investigate and fix (e.g. `TODO: upstream ashpd issue #123`).
* Do not submit commented-out code, debug `println!` statements, or dead scaffolding.

### 2. No AI Slop
* If you use AI tools as a development aid, you are solely responsible for understanding, validating, and testing every line of code you submit.
* Do **NOT** dump raw, unverified AI outputs, boilerplate wrappers, fabricated mocks, or hallucinated APIs into this repository.
* Every contribution must be thoughtful, robust, minimal, and battle-tested on real Linux desktop sessions.

### 3. Solve Real, Universal Problems
* Only fix or change something if it is truly broken or missing for all users and distributions, not just a quirk of your personal ephemeral setup.
* Avoid gratuitous refactorings or stylistic churn that provides zero performance or functional benefit.
* Keep pull requests focused on a single feature, bug fix, or performance optimization.

### 4. Wayland-First Architecture
* ShareL is built specifically for Linux Wayland environments.
* When adding compositor or backend features, ensure they respect the backend hierarchy:
  1. `XDG Desktop Portal` (Standard cross-desktop API)
  2. `grim / slurp` (Direct Wayland screencopy)
  3. `gpu-screen-recorder` / `wf-recorder` (Hardware-accelerated and screencopy recording)
  4. Native compositor IPC (`niri`, `hyprctl`, `swaymsg`, etc.)
* Never introduce X11-only dependencies or hardcoded desktop environment assumptions without proper fallbacks.

### 5. Verification Checklist Before Submitting PR
Before opening a pull request:
1. Run `cargo check` and `cargo test` in `src-tauri/` to verify Rust code quality and compilation.
2. Run `pnpm build` (`tsc && vite build`) to ensure frontend TypeScript types and bundles compile cleanly with zero errors.
3. Strip any temporary comments or debug logs.
4. Verify functionality locally under your Wayland compositor (Niri, Hyprland, Sway, GNOME, KDE, or COSMIC).
