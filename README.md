# XTemplate Studio

Local, offline, standalone editor for creating and customizing `.xtemplate` do XNotes Android.

## Guia de autoria `.xtemplate`

Read [the XTemplate format guide](docs/GUIA-XTEMPLATE.md) to understand elements, expressions, colors, fills, variables, and how to test compatibility with XNotes Android.

## Executar

**Quick start:** execute `./start.sh`. The script starts the local server and opens the browser at http://127.0.0.1:8765. If the server is already running, it simply opens the app.

```bash
cd /home/wesley/Downloads/xtemplate-editor
chmod +x start.sh stop.sh
./start.sh
```

Para encerrar um servidor iniciado pelo script, use `./stop.sh`. Se iniciou manualmente com Python, encerre com Ctrl+C no terminal.

No Node.js, npm, external libraries, or internet access required. The server listens only on `127.0.0.1`, so the app is not exposed to the local network.

## Recursos

- Visual editor with SVG preview, A4/A5/Letter page sizes, and automatic zoom fitting.
- Advanced JSON editor in a split pane beside the preview, with line numbers, formatting, and structural validation.
- Barra lateral com abas Camadas/Modelos para evitar exibir estrutura e exemplos ao mesmo tempo; propriedades comuns à vista e geometria avançada recolhida. Propriedades, variáveis e metadados ficam em abas separadas.
- Paleta fixa na área de design para seleção, navegação e inserção de formas; o menu contextual oferece todos os tipos de elemento.
- Controles de transformação por tipo de geometria, com alças para mover, redimensionar e rotacionar; cancelamento de gestos restaura a geometria original.
- Alinhamento rápido à esquerda, centro, direita, topo e base da página; ações para preencher toda a largura (X) ou altura (Y).
- Arrastar com prévia SVG leve (sem redesenhar a página inteira a cada movimento), guias inteligentes com tolerância constante em pixels e encaixe à página e a outras formas, inclusive com zoom, multisseleção e grupos aninhados.
- Menu de contexto que fecha ao inserir, clicar fora ou pressionar Esc; clique direito na estrutura (inclusive no espaço vazio) ou na página para inserir elementos.
- Coordenadas do mouse convertidas pela matriz SVG real; navegação por Espaço + arrastar, zoom com Alt + scroll e zoom pela barra de ferramentas.
- Parâmetros editáveis com valores de pré-visualização independentes dos valores padrão exportados.
- Import and export `.xtemplate`.
- Seletor único de modelos de demonstração, com explicação de que servem como ponto de partida e podem ser exportados como arquivos próprios.
- Atalhos Ctrl+N (novo), Ctrl+O (abrir), Ctrl+S (exportar), Ctrl+D (duplicar), Delete (remover), Insert (inserir), Alt + setas (ordenar), setas (mover 1 mm; Shift + setas: 10 mm), V/R/O/L/T (ferramentas), Ctrl+Enter (JSON), Espaço (navegação) e Alt + scroll (zoom).

## Compatibilidade

O formato é baseado em `TemplateReader.kt`, `TemplateEval.kt` e nos exemplos de `app/src/main/assets/templates/` do repositório XNotes. A validação respeita os limites gerais do leitor Android: 1 MiB, 32 níveis e 10.000 nós. Propriedades desconhecidas são preservadas pelo editor JSON.

A pré-visualização implementa os tipos básicos e expressões aritméticas usuais do formato, parâmetros, grupos, repetições, clipping e paths SVG. Ainda não é uma reprodução pixel a pixel do renderizador Android: o texto é renderizado pelas fontes do navegador, e hachuras, algumas expressões avançadas e detalhes de geometria podem diferir. Confira o resultado final no XNotes Android, sobretudo para templates complexos.

The folder `examples/` contains local copies of demo templates. The original Android repository files are not modified by this app.


## Atalhos de edição

- Ctrl+Z: desfazer.
- Ctrl+Shift+Z ou Ctrl+Y: refazer.
- V: selecionar; R: retângulo; O: elipse; L: linha; T: texto.
- Com retângulo, elipse, polígono ou linha ativa, clique e arraste no papel para desenhar e dimensionar. Shift mantém retângulos/elipses proporcionais.
- Com texto ativo, clique no papel para inserir texto naquele ponto. Elementos criados dentro de um grupo são armazenados nas coordenadas locais corretas.
- Espaço + arrastar: mover a página na área de trabalho.
- Alt + roda do mouse: alterar o zoom. O arrasto usa a mesma escala real da página, incluindo o zoom e o deslocamento da tela.\n- Ao selecionar várias formas, arraste qualquer forma selecionada para mover o conjunto; use as setas para ajustes de 1 mm (Shift: 10 mm).
- O histórico mantém até 100 estados e é reiniciado ao abrir outro template.


## Estrutura para desenvolvimento

- app.js: inicialização e coordenação do editor existente.
- src/features/alignment.js: comandos isolados de alinhamento e preenchimento em relação à página.
- src/features/pointer-geometry.js e src/features/snapping.js: conversão de coordenadas SVG e encaixe testáveis independentemente da interface.
- src/features/repeat-layout.js: cálculo de repetições isolado e coberto por testes, alinhado à contagem do leitor Android.
- src/features/translations.js: dicionário e tradução de mensagens dinâmicas, separados do observador DOM.
- tests/pointer-geometry.test.js, tests/snapping.test.js, tests/repeat-layout.test.js e tests/translations.test.js: regressões da interação com o mouse, guias, repetições e idioma.
- src/core/validate-template.js: validação independente da interface, compartilhada por importação, edição JSON e operações visuais; centraliza os limites do formato.
- tests/validate-template.test.js: testes automatizados de estrutura, limites, tamanho UTF-8 e compatibilidade dos exemplos.
- examples/: templates de demonstração usados para validar compatibilidade.
- package.json: verificações de sintaxe e testes nativos do Node.js; não adiciona dependências de runtime.

### Verificações locais

Com Node.js 18 ou superior, execute antes de publicar mudanças:

```bash
npm run check
npm test
```

A suíte valida todos os arquivos `.xtemplate` de `examples/` e cobre os limites de 1 MiB, 32 níveis e 10.000 nós. Ela complementa — não substitui — a verificação visual no XNotes Android, pois o renderizador do editor é uma aproximação do renderizador nativo.

A aplicação continua sendo servida localmente e funciona offline após abrir. O uso de módulos ES permite adicionar novas funcionalidades em src/features/ sem introduzir um framework ou dependências externas desnecessárias.
