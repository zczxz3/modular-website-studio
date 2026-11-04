# Security model

This is an alpha local-browser development tool, not a hardened untrusted-code hosting service.

Editing uses an opaque-origin sandboxed iframe. Only the trusted bridge runs there. Project scripts and active attributes are removed from the editing projection while original source remains in the project. The parent checks sender window and random channel. Explicit runtime preview has no command bridge and blocks network connections, forms, popups and parent-origin access through sandbox/CSP.

The built-in tabs/accordion runtime executes only in explicit preview or exported pages. Explicit preview also permits classic data-script URLs to support reopening the application's single-HTML exports; this does not change the editing iframe's nonce-only script policy. Third-party module ZIPs remain static and cannot request this runtime privilege.

Preview permissions do not carry over to export: exported source is a normal website, including its original scripts. Review code before publishing or running third-party projects. Images may use HTTPS URLs in preview and can make network requests. CPU-heavy scripts and resource exhaustion are not fully mitigated by iframe isolation.

ZIP inputs enforce size/count bounds and reject unsafe paths. Static module installation rejects scripts, event attributes, requested permissions and dependencies. Modules are not allowed to execute code in the editor context. Server-side module scanning, signatures, dependency isolation, trusted-plugin permissions and supply-chain attestations are future work.

Do not commit credentials or private user projects. For a suspected security issue, use a minimal benign reproduction and avoid publishing secrets in an issue. There is no guaranteed response SLA for this early project.
