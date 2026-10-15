# XTemplate Studio

Editor local, offline e independente para criar e personalizar arquivos `.xtemplate` do XNotes Android.

## Guia de autoria `.xtemplate`

Leia [o guia do formato XTemplate](docs/GUIA-XTEMPLATE.md) para entender elementos, expressões, cores, preenchimentos, parâmetros e como testar compatibilidade com o XNotes Android.

## Executar

**Forma simples:** execute `./start.sh`. O script inicia o servidor local e abre o navegador em http://127.0.0.1:8765. Se o servidor já estiver ativo, apenas abre a aplicação.

```bash
cd /home/wesley/Downloads/xtemplate-editor
chmod +x start.sh stop.sh
./start.sh
```

Para encerrar um servidor iniciado pelo script, use `./stop.sh`. Se iniciou manualmente com Python, encerre com Ctrl+C no terminal.

Não requer Node.js, npm, bibliotecas externas ou acesso à internet. O servidor escuta somente em `127.0.0.1`, então não expõe a aplicação à rede local.

## Recursos

- Editor visual com pré-visualização SVG, dimensões A4, A5 e Carta e ajuste automático de zoom.
- Editor JSON avançado em painel dividido ao lado da pré-visualização, com numeração de linhas, formatação e validação estrutural.
- Árvore de elementos no painel esquerdo; propriedades, parâmetros e metadados em painéis laterais separados.
- Paleta fixa na área de design para seleção, navegação e inserção de formas; o menu contextual oferece todos os tipos de elemento.
- Controles de transformação por tipo de geometria, com alças para mover, redimensionar e rotacionar elementos compatíveis.
- Alinhamento rápido à esquerda, centro, direita, topo e base da página; ações para preencher toda a largura (X) ou altura (Y).
- Guias inteligentes temporárias e encaixe no centro e nas bordas da página ao arrastar elementos.
- Menu de contexto que fecha ao inserir, clicar fora ou pressionar Esc; clique direito na estrutura (inclusive no espaço vazio) ou na página para inserir elementos.
- Navegação por Espaço + arrastar, zoom com Alt + scroll e zoom pela barra de ferramentas.
- Parâmetros editáveis com valores de pré-visualização independentes dos valores padrão exportados.
- Importação e exportação de arquivos `.xtemplate`.
- Seletor único de modelos de demonstração, com explicação de que servem como ponto de partida e podem ser exportados como arquivos próprios.
- Atalhos Ctrl+N (novo), Ctrl+O (abrir), Ctrl+S (exportar), Ctrl+D (duplicar), Delete (remover), Insert (inserir), Alt + setas (ordenar), setas (mover 1 mm; Shift + setas: 10 mm), V/R/O/L/T (ferramentas), Ctrl+Enter (JSON), Espaço (navegação) e Alt + scroll (zoom).

## Compatibilidade

O formato é baseado em `TemplateReader.kt`, `TemplateEval.kt` e nos exemplos de `app/src/main/assets/templates/` do repositório XNotes. A validação respeita os limites gerais do leitor Android: 1 MiB, 32 níveis e 10.000 nós. Propriedades desconhecidas são preservadas pelo editor JSON.

A pré-visualização implementa os tipos básicos e expressões aritméticas usuais do formato, parâmetros, grupos, repetições, clipping e paths SVG. Ainda não é uma reprodução pixel a pixel do renderizador Android: o texto é renderizado pelas fontes do navegador, e hachuras, algumas expressões avançadas e detalhes de geometria podem diferir. Confira o resultado final no XNotes Android, sobretudo para templates complexos.

A pasta `examples/` contém cópias locais dos templates de demonstração. Os arquivos originais do repositório Android não são modificados por esta aplicação.


## Atalhos de edição

- Ctrl+Z: desfazer.
- Ctrl+Shift+Z ou Ctrl+Y: refazer.
- V: selecionar; R: retângulo; O: elipse; L: linha; T: texto.
- Com retângulo, elipse ou linha ativa, clique e arraste no papel para desenhar e dimensionar.
- Com texto ativo, clique no papel para inserir texto naquele ponto.
- Espaço + arrastar: mover a página na área de trabalho.
- Alt + roda do mouse: alterar o zoom.
- O histórico mantém até 100 estados e é reiniciado ao abrir outro template.


## Estrutura para desenvolvimento

- app.js: inicialização e coordenação do editor existente.
- src/features/alignment.js: comandos isolados de alinhamento e preenchimento em relação à página.
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
