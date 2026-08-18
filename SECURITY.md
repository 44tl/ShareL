# Security Policy

## Supported Versions

Security updates and patches are actively maintained for the latest release branch of ShareL.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

We take the security of ShareL and our users seriously. If you discover a security vulnerability or sensitive issue, please report it responsibly rather than opening a public issue.

### How to Report

1. **GitHub Security Advisory (Preferred)**:
   Navigate to the [Security Advisories](https://github.com/44tl/ShareL/security/advisories) tab on GitHub and click **"Report a vulnerability"** to open a private disclosure draft.

2. **Email Disclosure**:
   If you are unable to use GitHub Security Advisories, send a detailed report to the repository maintainers with:
   - A clear description of the vulnerability and its potential impact.
   - Exact steps or a Proof-of-Concept (PoC) to reproduce the issue.
   - Affected desktop compositors, platforms, or backend dependencies.
   - Any suggested remediations or mitigations.

### Response Timeline

- **Initial Acknowledgment**: Within 48 hours of report receipt.
- **Triage & Assessment**: Within 5 business days with status updates on validation and severity evaluation.
- **Fix & Advisory Release**: Coordinated public disclosure following verification and deployment of a patched release.

---

## Security Practices & Scope

### 1. Custom Uploader Tokens & Secrets
* ShareL supports ShareX `.sxcu` configurations which may contain private API keys, bearer tokens, or basic auth headers.
* Uploader secrets and configuration files are stored locally in the user's standard configuration directory (`~/.config/sharel/`).
* Never share raw `.sxcu` files containing active production tokens publicly.

### 2. Wayland Screen Access & Permissions
* Screen captures and screencasts use standard Linux security interfaces, primarily the `XDG Desktop Portal` (`org.freedesktop.portal.ScreenCast` / `org.freedesktop.portal.Screenshot`) and compositor-authorized pipes.
* ShareL never bypasses Wayland isolation policies.

### 3. Local IPC & Process Isolation
* Child recording processes run in isolated process groups to prevent signal bleeding or unintended session manipulation.
* Webview communication adheres to strict Tauri IPC protocol boundaries with origin validation.
