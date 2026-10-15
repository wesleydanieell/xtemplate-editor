# XTemplate Studio

Editor local, offline e independente para criar e personalizar arquivos `.xtemplate` do XNotes Android.

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
- Controles de transformação por tipo de geometria, com posição da caixa delimitadora para elipses/círculos, rotação e opacidade; alças para mover e redimensionar formas compatíveis.
- Menu de contexto que fecha ao inserir, clicar fora ou pressionar Esc; clique direito na estrutura (inclusive no espaço vazio) ou na página para inserir elementos.
- Navegação por Espaço + arrastar, zoom com Alt + scroll e zoom pela barra de ferramentas.
- Parâmetros editáveis com valores de pré-visualização independentes dos valores padrão exportados.
- Importação e exportação de arquivos `.xtemplate`.
- Cinco modelos rápidos e seletor de 23 templates de demonstração no painel esquerdo, na seção Modelos.
- Atalhos Ctrl+N (novo), Ctrl+O (abrir), Ctrl+S (exportar), Ctrl+D (duplicar), Delete (remover), Insert (inserir), Alt + setas (ordenar), setas (mover 1 mm; Shift + setas: 10 mm), V/R/O/L/T (ferramentas), Ctrl+Enter (JSON), Espaço (navegação) e Alt + scroll (zoom).

## Compatibilidade

O formato é baseado em `TemplateReader.kt`, `TemplateEval.kt` e nos exemplos de `app/src/main/assets/templates/` do repositório XNotes. A validação respeita os limites gerais do leitor Android: 1 MiB, 32 níveis e 10.000 nós. Propriedades desconhecidas são preservadas pelo editor JSON.

A pré-visualização implementa os tipos básicos e expressões aritméticas usuais do formato, parâmetros, grupos, repetições, clipping e paths SVG. Ainda não é uma reprodução pixel a pixel do renderizador Android: o texto é renderizado pelas fontes do navegador, e hachuras, algumas expressões avançadas e detalhes de geometria podem diferir. Confira o resultado final no XNotes Android, sobretudo para templates complexos.

A pasta `examples/` contém cópias locais dos templates de demonstração. Os arquivos originais do repositório Android não são modificados por esta aplicação.
