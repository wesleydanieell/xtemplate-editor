# Security policy

## Supported versions

This project is in alpha. Security fixes target the latest version on `main` and the next prerelease. Older alpha versions may not receive patches.

## Reporting a vulnerability

**Do not publish exploits, private data or credentials in a public GitHub issue.** If GitHub's **Report a vulnerability** option is available under the repository's Security tab, use it to contact the maintainers privately. Otherwise, open a minimal issue requesting a private security contact, without including technical exploitation details.

Include the affected version, reproducible steps, impact and a possible mitigation in the private report. Do not attach real users' private `.xtemplate` files.

## Scope and design

XTemplate Studio reads local JSON-based template files, renders vector graphics in the browser and can export `.xtemplate` files. The optional Tauri desktop wrapper bundles local web assets, does not register privileged commands and has a restricted Content Security Policy. As with other desktop programs, only download releases from the official repository, and avoid opening templates from unknown sources.

Security checks: `npm audit`, unit tests, review of Rust/Tauri dependency advisories and checks for accidental committed secrets. Passing these checks is not a guarantee that no vulnerability exists.
