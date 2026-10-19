# XTemplate Studio

Local, offline, standalone editor for creating and customizing `.xtemplate` do XNotes Android.

## Primeira versão alpha — v0.1.0-alpha.1

Esta é uma **versão de testes**. O aplicativo funciona localmente no navegador, sem servidor externo e sem conta. Não é necessário instalar dependências de JavaScript.

### Instalação (Linux)

1. Baixe `XTemplate-Studio-v0.1.0-alpha.1.zip` na seção **Releases** do GitHub e extraia o arquivo.
2. Abra a pasta `XTemplate-Studio` e execute `./start.sh` (Python 3 e um navegador instalados).
3. Acesse `http://127.0.0.1:8765/` se o navegador não abrir automaticamente.
4. Para encerrar um servidor iniciado pelo script, execute `./stop.sh`.

No Windows e no macOS, a aplicação web pode ser servida localmente com Python 3: na pasta extraída, execute `python3 -m http.server 8765 --bind 127.0.0.1` (no Windows, pode ser `py -3 -m http.server 8765 --bind 127.0.0.1`) e abra o endereço acima. **Não abra `index.html` via `file://`**: os módulos e exemplos exigem um servidor HTTP local.

### Limitações conhecidas da alpha

- A pré-visualização SVG pode diferir do XNotes Android em fontes, hachuras, expressões avançadas e elementos complexos. Sempre valide o `.xtemplate` exportado no XNotes.
- O editor não oferece sincronização em nuvem nem salvamento automático persistente: **exporte o arquivo antes de sair ou abrir outro modelo**.
- Não há instalador nativo para Windows, macOS ou Android. A distribuição é um arquivo ZIP portátil.

## Aplicativo Linux (AppImage) — alpha.2

A partir da **v0.1.0-alpha.2**, o projeto também oferece um aplicativo Linux desktop usando **Tauri 2** e WebKitGTK. Ele incorpora a mesma interface web e os templates locais; o AppImage não precisa de Python nem de servidor HTTP para abrir o editor. O ZIP web permanece disponível.

1. Na seção **Releases**, baixe o arquivo `.AppImage` para Linux x86_64.
2. Torne o arquivo executável (`chmod +x ./XTemplate*.AppImage`) e abra-o com um clique duplo ou pelo terminal.
3. No AppImage, use os mesmos comandos **Open** e **Export** para arquivos `.xtemplate`.

A plataforma Linux exige bibliotecas gráficas compatíveis com WebKitGTK 4.1 e GTK3. AppImage não garante execução em toda distribuição; para melhor compatibilidade, o binário oficial é compilado no Ubuntu 22.04. Caso o AppImage não inicie, ainda é possível usar o pacote ZIP web e o servidor Python local.

### Windows (.exe e .msi) — compilação automatizada

O editor também pode ser empacotado como aplicativo Windows via **Tauri 2 / Microsoft WebView2**. O workflow **Windows installers** compila dois formatos no runner `windows-latest` do GitHub Actions:

- **NSIS (`.exe`)** — instalador recomendado para a maioria dos usuários.
- **WiX (`.msi`)** — alternativa Windows Installer, útil para administração e distribuição corporativa.

Para testar um PR, abra **Actions → Windows installers** e baixe o artefato **XTemplate-Studio-Windows-installers** quando o job terminar com sucesso. A release oficial anexará ambos os instaladores apenas **nas próximas tags criadas depois da integração deste workflow**; a `v0.1.0-alpha.3` não muda.

Para compilar localmente no Windows, instale Rust com toolchain MSVC, Node.js 22, Python 3 e os requisitos de desenvolvimento Tauri 2 / Visual Studio C++ Build Tools e Windows SDK. Execute:

```powershell
npm ci
npm run desktop:build:windows
```

Os instaladores serão gerados em `src-tauri/target/release/bundle/nsis/` e `src-tauri/target/release/bundle/msi/`. O pacote Windows usa o identificador técnico `0.1.0-3`, equivalente ao `alpha.3`, porque o WiX/MSI aceita apenas sufixos pré-release numéricos; o código e a versão pública do projeto permanecem `v0.1.0-alpha.3`. O comando Linux `npm run desktop:build` permanece independente. O WebView2 Runtime é usado pelo Tauri para exibir a interface; a instalação padrão do Tauri gerencia sua disponibilidade quando necessário. Os instaladores não são assinados digitalmente por enquanto: o Windows SmartScreen pode mostrar um aviso de editor desconhecido.

### Compilar o AppImage

Em uma máquina Linux de desenvolvimento, instale Rust, Node.js 18+, Python 3 e as dependências [recomendadas pelo Tauri](https://v2.tauri.app/start/prerequisites/) (especialmente WebKitGTK 4.1, GTK3 e `patchelf`). Depois execute:

```bash
npm ci
npm run desktop:build
```

O resultado fica em `src-tauri/target/release/bundle/appimage/`. O workflow **Linux AppImage** compila e testa automaticamente em pull requests e atualizações da branch principal; a publicação por tag anexa o AppImage à prerelease existente.

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
- Árvore Structure com uma raiz virtual Page, rótulos numerados por tipo, metadados curtos e arrastar/soltar para reordenar ou mover nós entre grupos e a raiz. Exemplos ficam no menu File, em vez de ocupar uma aba da barra lateral.
- Barra de ferramentas organizada por frequência de uso; o botão + da estrutura e o menu contextual usam `New >` com tipos de elementos em ordem alfabética e ícones uniformes.
- Controles de transformação por tipo de geometria, com alças para mover, redimensionar e rotacionar; cancelamento de gestos restaura a geometria original.
- Seleção múltipla com alinhamento entre elementos (esquerda, centro, direita, topo e base) e distribuição uniforme de espaçamento horizontal/vertical.
- Agrupamento, duplicação, exclusão com confirmação e mover camadas com Alt+↑/↓. Ctrl+C, Ctrl+X e Ctrl+V copiam, cortam e colam nós entre grupos e a raiz.
- Alinhamento rápido à esquerda, centro, direita, topo e base da página; ações para preencher toda a largura (X) ou altura (Y).
- Arrastar com prévia SVG leve (sem redesenhar a página inteira a cada movimento), guias inteligentes com tolerância constante em pixels e encaixe à página e a outras formas, inclusive com zoom, multisseleção e grupos aninhados.
- Redimensionamento de grupos com grades/repetições usa uma transformação SVG temporária; o conteúdo denso só é recalculado ao soltar o mouse.
- Menu de contexto que fecha ao inserir, clicar fora ou pressionar Esc; clique direito na estrutura (inclusive no espaço vazio) ou na página para inserir elementos.
- Coordenadas do mouse convertidas pela matriz SVG real; navegação por Espaço + arrastar, zoom com Alt + scroll e zoom pela barra de ferramentas.
- Seleção múltipla entre tipos diferentes e edição simultânea das propriedades compartilhadas; variáveis recomendadas por tipo (cores versus valores numéricos) e formulário de criação em janela flutuante.
- Fluxo de criação de template com metadados e tamanho de pré-visualização, nome do arquivo editável na aba, menu File com configurações/idioma/abrir/exemplos/exportar e confirmação antes da exportação.
- Opacidade como slider e barra de propriedades rápidas na área livre da barra do canvas.
- As configurações da Page oferecem cores de pré-visualização para `ink` e `accent`. Como `.xtemplate` não possui um campo separado para a cor de pré-visualização de cada variável, o painel Variables permite ajustar seu valor de pré-visualização local; somente o valor padrão da variável é exportado.
- Atalhos Ctrl+N (novo), Ctrl+O (abrir), Ctrl+S (exportar), Ctrl+C/X/V (copiar/cortar/colar), Ctrl+D (duplicar), Delete (remover), Insert (inserir), Alt+↑/↓ (ordenar camadas), setas (mover 1 mm; Shift+setas: 10 mm), V/R/O/L/T (ferramentas), Ctrl+Enter (JSON), Espaço (navegação) e Alt+scroll (zoom).

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

- app.js: inicialização, eventos e coordenação do editor.
- src/core/expressions.js: avaliação segura de expressões e conversão de unidades, isoladas do DOM.
- src/core/history.js: histórico limitado de snapshots, com undo/redo e descarte de refazer após uma nova edição.
- src/core/tree-operations.js: normalização de seleção e operações de agrupar, duplicar e excluir nós.
- src/features/arrange-selection.js: cálculo de alinhamento e distribuição de seleções múltiplas, independente da interface.
- src/features/alignment.js: comandos isolados de alinhamento e preenchimento em relação à página.
- src/features/pointer-geometry.js e src/features/snapping.js: conversão de coordenadas SVG e encaixe testáveis independentemente da interface.
- src/features/repeat-layout.js: cálculo de repetições isolado e coberto por testes, alinhado à contagem do leitor Android.
- src/features/resize-preview.js: prévia de redimensionamento/rotação de grupos via transformações SVG, sem reconstruir grids em cada movimento do mouse.
- src/features/translations.js: dicionário e tradução de mensagens dinâmicas, separados do observador DOM.
- tests/expressions.test.js, tests/history.test.js, tests/tree-operations.test.js e tests/arrange-selection.test.js: regressões de expressões, seleção/estrutura e organização de múltiplos elementos.
- tests/pointer-geometry.test.js, tests/snapping.test.js, tests/repeat-layout.test.js, tests/resize-preview.test.js e tests/translations.test.js: regressões da interação com o mouse, guias, repetições e idioma.
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

A publicação da alpha é automatizada: tags `v*-alpha.*` executam os testes e produzem o ZIP na seção **Releases** do GitHub.

## Contribuir e reportar problemas

O projeto é público e recebe issues e pull requests. Veja [CONTRIBUTING.md](CONTRIBUTING.md) para instruções de desenvolvimento, testes e propostas de mudanças, [SECURITY.md](SECURITY.md) para reportar vulnerabilidades e [LICENSE](LICENSE) para a licença MIT do código do editor. Os exemplos `.xtemplate` podem ter metadados e licenças próprios; consulte cada arquivo antes de reutilizá-los fora do projeto.

### Camadas e propriedades (versão de desenvolvimento)

- Use **duplo clique** ou **F2** em uma camada para dar um nome específico (por exemplo, “Linha do cabeçalho”). Sem nome personalizado, as camadas exibem tipo, ordinal e contexto geométrico.
- Arraste uma camada para a parte superior/inferior de outra para ordenar, para o centro de um grupo ou repetição para aninhar, ou para **Page** ou o espaço vazio da árvore para retornar à raiz. Arrastar a mesma camada para dentro dela própria ou de seus descendentes é bloqueado.
- `Alt+↑` e `Alt+↓` movem uma ou várias camadas selecionadas um nível na ordem entre irmãs, sem alterar a ordem relativa entre as selecionadas.
- `Ctrl+C`, `Ctrl+X` e `Ctrl+V` fazem cópia/corte e colagem entre grupos e raiz. Ao colar com um grupo ou repetição selecionado, o conteúdo é inserido no contêiner.
- A edição de seleção múltipla exibe apenas propriedades que **todos** os elementos selecionados possuem. Não adiciona implicitamente atributos ausentes ou não compatíveis.
- Os nomes de camadas (`name` no nó) servem à organização do editor; como nem todos os leitores `.xtemplate` usam esse campo, o desenho final não deve depender dele.

### Seleção de elementos na Structure

- Clique simples seleciona um elemento.
- **Ctrl+clique** (ou Cmd+clique no macOS) adiciona/remove elementos de qualquer tipo, inclusive de grupos diferentes.
- **Shift+clique** seleciona o intervalo de camadas visíveis na árvore, mesmo que os tipos sejam diferentes. **Ctrl+Shift+clique** acrescenta esse intervalo à seleção atual.
- Ao selecionar um grupo e seus filhos simultaneamente, o editor mantém o grupo selecionado para não aplicar a mesma alteração duas vezes.
- O painel **Element** exibe somente as propriedades que todos os nós selecionados possuem; ordenar/agrupá-los continua sujeito à regra de pertencerem ao mesmo contêiner.

### Menu de aplicativo (versão de desenvolvimento)

A barra superior segue o padrão de aplicativos desktop com **File, Edit, View, Insert e Settings** à esquerda. O nome do documento pode ser editado na aba logo abaixo, e o botão **Export** fica sempre acessível à direita. As ações têm atalhos exibidos nos menus, os menus funcionam com teclado (setas laterais e Esc) e os modelos de exemplo aparecem em **Insert → Example templates**. O idioma fica somente em **Settings**.

### Testes de interação no navegador

Além de `npm test`, execute `npm run test:browser` para verificar os fluxos reais de seleção do SVG, controles de transformação, arraste e seleção por área. Esse teste utiliza `puppeteer-core`, com o navegador definido em `XTEMPLATE_BROWSER_PATH` (Chrome/Chromium/Brave executável). No Linux:

```bash
npm ci
XTEMPLATE_BROWSER_PATH=/usr/bin/chromium npm run test:browser
```

O GitHub Actions executa esse teste com o Chrome instalado no runner. Testes de interação são importantes porque eventos do navegador podem falhar mesmo quando os testes unitários passam.

### Guias inteligentes e encaixe entre elementos

Com a ferramenta **V (Select)**, arraste um elemento em direção às bordas ou centros de outros elementos, inclusive elementos dentro de grupos. O editor destaca pontos de referência e exibe uma **guia rosa curta ligando os objetos** quando encontra um alinhamento dentro da tolerância de aproximadamente 7 pixels de tela. Ao soltar, o elemento fica encaixado na coordenada da guia. Também há referências para bordas e centros da página, mostradas com guias que atravessam a página. As guias desaparecem após o arraste; elas servem apenas ao editor e **não** são exportadas para `.xtemplate`.

Para textos, há contorno de seleção e uma alça de rotação; o tamanho do texto continua configurado pela propriedade **Size**. Nós `repeat` são editados no painel de propriedades; encaixe magnético automático não é aplicado ao arraste de ocorrências repetidas.

### Espaço de trabalho e aparência (desenvolvimento)

- **File → Document properties…** abre uma janela para metadados, tamanho de página de prévia e cores de referência do editor. O botão **Done** permanece acessível enquanto os campos rolam. **Selecionar Page na Structure mostra esses mesmos campos na aba Element**, sem modal. Não existem cópias divergentes do formulário: ele é reaproveitado nos dois locais.
- As cores de prévia **Ink** e **Accent** também aparecem junto ao cabeçalho do canvas. Os dois conjuntos de seletores são sincronizados. Cor de prévia e tamanho de página são ajustes locais do editor, não novos campos do `.xtemplate` exportado.
- A **Page** é o nível raiz da árvore **Structure**. Os primeiros nós estão recuados como seus filhos, e cada grupo aumenta o recuo.
- Em **Settings → Appearance**, selecione **Graphite**, **Dusk Blue** ou **Midnight**. A preferência fica no `localStorage` deste navegador e não modifica o template.
- **Transformação:** X, Y, largura e altura usam campos numéricos precisos e rótulos que podem ser arrastados horizontalmente (*scrubby fields*). Opacidade usa slider. Rotação oferece um dial circular (Shift para ajuste de 0,1°), atalhos de 0°/45°/90°/180° e campo numérico que aceita ângulos exatos. Valores de comprimento e expressões do XTemplate continuam disponíveis nos campos avançados.

Esses recursos não precisam de dependências adicionais em runtime e funcionam tanto na versão web portátil quanto no empacotamento desktop Tauri, após uma nova compilação.

### Sugestões e formatos de valores

Ao focar um campo compatível em **Element**, surge uma lista de variáveis com nome, tipo, rótulo e valor padrão, usando as cores do tema. Digitar filtra as opções; setas ↑/↓ navegam, **Enter** insere e **Esc** fecha. Para expressões, o editor substitui somente o identificador sob o cursor (por exemplo, `W * spa` → `W * spacing`), sem apagar os outros termos. Campos de Stroke/Fill sugerem apenas tokens de cor (`ink`, `accent`, `none`) e variáveis do tipo `color`.

Os campos exibem pequenas indicações sobre o formato aceito, como `mm`, porcentagem, HEX ou expressão. O seletor **Type** das variáveis também explica com exemplos o significado de `length`, `color`, `number` e `integer`.

### Organizar camadas por nome e cor na Structure

- **Renomear:** dê um duplo clique no nome da camada ou selecione-a e pressione **F2**. Confirme com **Enter**, cancele com **Esc**. O nome do elemento faz parte do JSON `.xtemplate`.
- **Cor de identificação:** clique no ponto colorido ao lado da camada para escolher uma das sete cores ou uma personalizada; **Clear color** remove a marca. A cor identifica a camada e seu ícone na árvore, sem alterar o preenchimento ou traço do desenho.
- **Importante:** as cores de organização são **somente do editor**, salvas no armazenamento local do navegador para cada ID de documento e caminho da camada. Elas **não** são incluídas no `.xtemplate` exportado e portanto não são transferidas com o arquivo para outros navegadores/dispositivos. Em edições estruturais amplas ou reimportações, as identificações podem precisar ser reaplicadas.

### Seleção entre níveis diferentes da Structure

Use **Ctrl/Cmd + clique** para selecionar camadas de qualquer nível da árvore, incluindo grupo e descendente ao mesmo tempo. **Shift + clique** seleciona o intervalo visível na árvore, atravessando grupos e níveis de profundidade; **Ctrl/Cmd + Shift + clique** adiciona um intervalo à seleção existente. A aba **Element** só apresenta propriedades **suportadas por todos os tipos selecionados, inclusive as opcionais que ainda não estão declaradas**, e alterações feitas ali são aplicadas a todos eles. Propriedades incompatíveis ficam ocultas. Ações que reorganizam camadas exigem irmãos no mesmo grupo, enquanto exclusão e recorte ignoram descendentes cujo ancestral já será removido, para não processar duas vezes a mesma árvore. Ao selecionar vários níveis, use preferencialmente o painel Element para edição conjunta.

O zoom por botões e pelo menu **View** passa a preservar o centro visual atual da página ao alternar escalas; o zoom com Alt + roda do mouse continua ancorado no ponteiro.

### Cores de organização em lote

Selecione duas ou mais camadas na **Structure** com **Ctrl/Cmd** ou **Shift**, inclusive entre grupos e níveis hierárquicos. Clique no **indicador de cor** de qualquer uma das camadas selecionadas, ou clique com o botão direito em uma delas e escolha **Organization color**: as sete opções, a cor personalizada e **Clear color** serão aplicadas **a todos os itens selecionados**. O seletor mostra quantas camadas serão afetadas. Se clicar no indicador de uma camada fora da seleção atual, somente essa camada receberá a cor. Etiquetas são locais ao navegador/editor e não afetam o Stroke, Fill ou o arquivo `.xtemplate` exportado.

### Edição simultânea: compatibilidade por tipo

Na aba **Structure**, selecione várias camadas com **Ctrl/Cmd** ou **Shift**. A aba **Element** permite editar em conjunto todas as propriedades que fazem sentido para **todos os tipos selecionados**, mesmo quando o atributo opcional não está explicitamente escrito em algum deles. Por exemplo, duas `hline` sempre podem editar `y`, `x1`, `x2`, `stroke` e `strokeWidth`, mesmo que uma delas omita `x1` e/ou `x2`. A apresentação considera os valores padrão do formato ou indica que um valor é herdado/não definido. Um atributo só é gravado nos elementos quando o campo é alterado; os demais atributos e a hierarquia são preservados. Campos incompatíveis com algum tipo da seleção continuam ocultos (por exemplo, `period` só existe em tipos que o suportam).

### Guias magnéticas de alinhamento

Em **Settings → Magnetic guides**, ative ou desative o encaixe ao mover objetos; a preferência permanece salva localmente no navegador. As guias usam a geometria **visível** (e não a área transparente usada para clique), incluindo linhas, curvas, grupos, elementos com rotação e cópias renderizadas por `repeat`. O alinhamento compara bordas e centros dos elementos com outros objetos e com a página, respeitando a proximidade de aproximadamente 7 pixels na tela. Quando desativadas, nem o encaixe nem as linhas-guia são produzidos. A configuração não é incluída no `.xtemplate` exportado.

### Controles de transformação em instâncias de `repeat`

Ao selecionar um elemento filho de `repeat`, o editor mostra as alças de transformação **somente na cópia ativa**, evitando controles sobrepostos em todas as instâncias. Clique em outra cópia no canvas para transferir as alças para ela. Arrastar ou redimensionar qualquer cópia modifica **o único elemento de origem** do template: as demais instâncias são atualizadas automaticamente. O cálculo usa a posição da cópia clicada para interação, mas grava as coordenadas corretas no sistema de referência original, sem acumular o deslocamento de linha/coluna da repetição. Guias magnéticas horizontais também consideram cada linha gerada por `repeat`, não somente o contêiner ou a primeira linha.

**Rotação do conjunto:** um único controle de rotação aparece na **moldura exterior do `repeat`**, acima do conteúdo. Girá-lo aplica uma transformação rígida bidimensional à **face inteira**, em torno do centro comum: o comprimento das linhas e a distância entre cópias permanecem iguais, como ao girar um quadrado de frente. O ângulo é armazenado na propriedade `rotate` do nó `repeat`, **sem** adicionar `rotate` aos seus filhos. Os filhos selecionados mantêm alças de redimensionamento somente na instância ativa; clicar em outra cópia transfere essas alças, mas nunca cria outra rotação independente. Textos filhos também não herdam uma segunda rotação do pai. Essa separação evita o efeito de inclinação/perspectiva visto ao girar linhas individualmente.

### Blank documents by default

The Studio opens with an empty `.xtemplate`: `items: []` and `params: {}`.
**File → New template** also creates an empty document, without predefined
layers, variables or a forced license. Bundled examples remain accessible
from **Insert → Example templates** and the optional examples panel.

### Experimental vector tools

The Element inspector now provides visual editing for Polygon/Polyline vertices, Hatch pattern settings, and a safe SVG Path node subset. For supported features, limits and Android compatibility notes, see [Vector Tools](docs/VECTOR_TOOLS.md).
