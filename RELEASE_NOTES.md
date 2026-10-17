# XTemplate Studio — v0.1.0-alpha.3

Terceira versão alpha do editor offline para `.xtemplate`, incluindo os PRs #1–#5.

## Novidades

- Estrutura e camadas: seleção mista (Ctrl/Shift), reorganização segura entre grupos, renomeação por F2, etiquetas de cor por camada e ações de organização no clique direito.
- Canvas: seleção e alças estáveis, arraste com prévia ao vivo, guias magnéticas para centros/bordas da página e outros elementos, incluindo elementos de grupos.
- Interface desktop: menus File, Edit, View, Insert e Settings; propriedades do arquivo em uma janela separada e no painel Element ao selecionar Page; cores de prévia rápidas.
- Três temas — Graphite, Dusk Blue e Midnight — com preferências locais; espaçamentos e contraste revisados.
- Transformações: roda e predefinições de rotação com entrada exata; sugestões de variáveis personalizadas, dicas de formatos e exemplos para tipos de parâmetros.
- Correções de zoom View, foco indevido de botões, seleção por área, formulário de variáveis e layout responsivo.
- Segurança, documentação e integração contínua aprimoradas, com testes automatizados de interação real em Chrome/Brave.

## Download e uso

**Linux x86_64:** baixe o AppImage, execute `chmod +x nome-do-arquivo.AppImage` e inicie o arquivo. O AppImage usa Tauri 2 / WebKitGTK e não necessita de servidor local.

**ZIP web portátil:** baixe, extraia e execute `./start.sh` no Linux (Python 3) ou abra a aplicação a partir de outro servidor HTTP estático.

## Observações

As cores de organização da Structure são **locais ao editor** e não estão embutidas no `.xtemplate`; o nome da camada permanece no JSON exportado. Cores de prévia e tamanho de página também são opções de visualização, não novos campos do arquivo.

O SVG do editor é uma pré-visualização aproximada; confira no XNotes os arquivos exportados, especialmente templates complexos, fontes e expressões avançadas. O trabalho precisa ser exportado para ser salvo como `.xtemplate`.
