# Contributing to XTemplate Studio

Contributions are welcome. This project is an experimental, offline editor for the XNotes Android `.xtemplate` format.

## Before opening a pull request

1. Check existing issues and discussions to avoid duplicate work.
2. Fork the project and create a focused branch from `main` (`feat/…`, `fix/…`, or `refactor/…`).
3. Keep changes small and document any visible behavior change. Do not reformat unrelated files.
4. Run `npm run check` and `npm test`. For visual interactions, test in a browser and, if possible, check exported `.xtemplate` files in XNotes Android.
5. Submit the PR with a description of the problem, solution, relevant screenshots, and how you tested it.

The editor is based on browser-native JavaScript modules without a frontend runtime framework. Preserve that architecture unless the added dependency clearly warrants its cost. Tauri is an optional desktop packaging layer; changes to the web editor should continue to work in the portable ZIP version.

## Development

```bash
./start.sh                     # Linux + Python 3, local web server
npm run check
npm test
npm ci
npm run desktop:build          # Linux + Rust and Tauri system prerequisites
```

Documentation of the `.xtemplate` schema: [docs/GUIA-XTEMPLATE.md](docs/GUIA-XTEMPLATE.md).

## Security and privacy

- **Never commit credentials, API tokens, SSH keys, local `.env` files, personal templates containing private information, or locally generated build folders.** The `.gitignore` covers common cases but is not exhaustive.
- Do not load remote scripts, analytics or hosted fonts: the app is designed to work offline.
- Treat imported `.xtemplate` files as untrusted input; avoid `eval`, HTML injection, filesystem access, and unrestricted Tauri plugins.
- Follow [SECURITY.md](SECURITY.md) for vulnerabilities rather than posting working exploits in public issues.

## License

By submitting a contribution, you agree that your contribution is licensed under the repository's [MIT license](LICENSE).

## Branches, commits e releases

Use uma branch curta por objetivo e commits focados, seguindo preferencialmente `feat:`, `fix:`, `refactor:`, `test:`, `docs:` ou `security:`. Não envie mudanças diretamente à `main`: abra um pull request, aguarde os workflows **Checks** e **Linux AppImage** e faça revisão antes do merge. As releases são geradas apenas por tags versionadas, nunca por commits comuns.
