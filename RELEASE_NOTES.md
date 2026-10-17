# XTemplate Studio — v0.1.0-alpha.2

Segunda versão alpha: o editor visual de `.xtemplate` agora também é distribuído como **aplicativo Linux AppImage**.

## Novidades

- AppImage Linux x86_64 com Tauri 2, sem necessidade de instalar Python nem iniciar servidor HTTP.
- Janela de aplicativo independente, com ícone e recursos web incorporados offline.
- Fluxo de builds automatizado no GitHub Actions usando Ubuntu 22.04; o ZIP web continua disponível.
- Mesmas ferramentas de edição visual, importação/exportação de `.xtemplate`, árvores de elementos, parâmetros e editor JSON da alpha anterior.

## Como usar

**Linux (AppImage):** baixe o `.AppImage`, execute `chmod +x nome-do-arquivo.AppImage` e abra. Se houver incompatibilidade com as bibliotecas gráficas da distribuição, utilize o ZIP web.

**Pacote web:** baixe o ZIP, extraia e execute `./start.sh` no Linux (Python 3) ou use um servidor HTTP local em outras plataformas.

## Limitações da alpha

A pré-visualização SVG é uma aproximação do renderizador Android; valide no XNotes os arquivos exportados, sobretudo templates complexos, fontes, hachuras e expressões avançadas. O editor ainda exige exportação explícita dos arquivos para salvar seu trabalho. AppImage foi construído para Linux x86_64 e depende da compatibilidade de WebKitGTK e GTK3 no sistema.
