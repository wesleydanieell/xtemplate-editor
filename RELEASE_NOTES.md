# XTemplate Studio — v0.1.0-alpha.4

Quarta versão alpha, agora com **instaladores nativos para Windows**, além do Linux AppImage e pacote web portátil.

## Novidades

- **Windows 64 bits:** instalador NSIS (`.exe`) e WiX/MSI (`.msi`), baseados em Tauri 2 e Microsoft WebView2.
- **Zoom estável:** View → Zoom in / Zoom out preserva o centro visual da página, inclusive na transição da escala Fit.
- **Structure:** seleção simultânea com Ctrl/Shift entre níveis diferentes da árvore, incluindo grupos e descendentes; propriedades compatíveis podem ser editadas em lote.
- **Cores de organização em lote:** a paleta e Clear color atuam sobre todas as camadas selecionadas, inclusive pelo menu de contexto. Não alteram Stroke/Fill nem o arquivo `.xtemplate`.
- **Automação:** fluxos de CI atualizados e testes para Linux, Windows e interface web.

## Download e utilização

- **Windows x64:** prefira o instalador `.exe` (NSIS); o `.msi` é uma alternativa do Windows Installer. Requer Microsoft WebView2. Os instaladores ainda **não são assinados digitalmente**, portanto o SmartScreen pode exibir um aviso.
- **Linux x86_64:** baixe o `.AppImage` e torne-o executável com `chmod +x nome-do-arquivo.AppImage`.
- **Web portátil:** baixe o `.zip`, extraia e execute `./start.sh` em Linux com Python 3 ou sirva por HTTP estático.

## Limitações conhecidas

As etiquetas de cor na Structure são salvas somente no armazenamento local do editor; exportar `.xtemplate` não transfere essas etiquetas. Sempre confira no XNotes a renderização de templates complexos, fontes e expressões avançadas. Os documentos precisam ser exportados explicitamente para salvar um `.xtemplate`.
