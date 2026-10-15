const pairs = [
["Standalone template editor · XNotes Android","Editor de templates independente · XNotes Android"],
["Undo","Desfazer"],["Redo","Refazer"],["New template","Novo template"],["Open","Abrir"],["Export .xtemplate","Exportar .xtemplate"],
["Expand all","Expandir tudo"],["Add element (Insert)","Adicionar elemento (Insert)"],["Drag to reorder; drop onto a group to nest · Ctrl/Cmd-click: multi-select · Shift-click: range selection","Arraste para reordenar; solte em um grupo para aninhar · Ctrl/Cmd+clique: seleção múltipla · Shift+clique: selecionar intervalo"],
["DRAG · CTRL/SHIFT","ARRASTE · CTRL/SHIFT"],["＋ Add element","＋ Adicionar elemento"],["EXAMPLE TEMPLATES","MODELOS DE EXEMPLO"],["Start with a template","Comece com um modelo"],["Templates are ready-made examples to explore. Opening one replaces the current content; export first if you want to keep your changes.","Modelos são exemplos prontos para explorar. Abrir um substitui o conteúdo atual; exporte antes se quiser manter suas alterações."],
["AVAILABLE TEMPLATES","MODELOS DISPONÍVEIS"],["Open example…","Abrir exemplo…"],["Daily planner","Planejador diário"],["Dotted grid","Grade pontilhada"],["Engineering","Engenharia"],["Guitar tablature","Tablatura de guitarra"],["Isometric dots","Pontos isométricos"],["Isometric grid","Grade isométrica"],["Music staff","Pauta musical"],["Legal ruled paper","Papel pautado jurídico"],["Primary handwriting","Caligrafia infantil"],["Ruled paper","Papel pautado"],["Semi-log grid","Grade semilogarítmica"],["Weekly planner","Planejador semanal"],["Checklist","Lista de tarefas"],
["Toggle JSON editor","Alternar editor JSON"],["Split editor","Editor dividido"],["Close JSON","Fechar JSON"],["PAGE","PÁGINA"],["Zoom level","Nível de zoom"],["Hold Space and drag to pan the canvas","Segure Espaço e arraste para mover a tela"],["Space + drag · scroll: pan · Alt + scroll: zoom","Espaço + arrastar · rolagem: mover · Alt + rolagem: zoom"],["● Valid JSON","● JSON válido"],["PREVIEW","PRÉ-VISUALIZAÇÃO"],["Select an element to edit it; use the toolbar on the left to draw","Selecione um elemento para editá-lo; use a barra à esquerda para desenhar"],["Drawing tools","Ferramentas de desenho"],["Select and transform (V)","Selecionar e transformar (V)"],["Bezier pen (C)","Caneta Bézier (C)"],["Pen: create curves and anchor points (C)","Caneta: criar curvas e pontos de ancoragem (C)"],["Insert ruled lines","Inserir linhas pautadas"],["Insert grid","Inserir grade"],["Draw line (L)","Desenhar linha (L)"],["Insert text (T)","Inserir texto (T)"],["Page preview","Pré-visualização da página"],["Fit to screen","Ajustar à tela"],["JSON do template","JSON do modelo"],["Line 1, column 1","Linha 1, coluna 1"],["Advanced editing","Edição avançada"],["Format","Formatar"],["Revert","Reverter"],["Local","Local"],["Ready","Pronto"],["Element","Elemento"],["Variables","Variáveis"],["File","Arquivo"],["SELECTED ELEMENT","ELEMENTO SELECIONADO"],["No element selected","Nenhum elemento selecionado"],["Choose a node in the structure or click an element on the page to inspect it.","Escolha um nó na estrutura ou clique em um elemento da página para inspecioná-lo."],["TRANSFORM","TRANSFORMAÇÃO"],["Alignment to page","Alinhamento em relação à página"],["ALINHAR NA PAGE","ALINHAR À PÁGINA"],["Align to page left","Alinhar à esquerda da página"],["Center horizontally","Centralizar horizontalmente"],["Align to page right","Alinhar à direita da página"],["Align to page top","Alinhar ao topo da página"],["Center vertically","Centralizar verticalmente"],["Align to page bottom","Alinhar à base da página"],["Fill page width","Preencher toda a largura da página"],["Fill page height","Preencher toda a altura da página"],["Fill width","Preencher largura"],["Fill height","Preencher altura"],["0 or expression","0 ou expressão"],["Ink, accent or #hex","Tinta, destaque ou #hex"],["None, accent or #hex","Nenhum, destaque ou #hex"],["Appearance","Aparência"],["Stroke width","Espessura do traço"],["Text content","Conteúdo do texto"],["Element text","Texto do elemento"],["Use “ink”/“accent”, a hex color, or a Color variable. “none” makes the fill transparent.","Use “ink”/“accent”, uma cor hexadecimal ou uma variável de cor. “none” deixa o preenchimento transparente."],["Duplicate","Duplicar"],["Delete","Excluir"],["Values support mm units and XTemplate expressions.","Os valores aceitam unidades mm e expressões XTemplate."],["TEMPLATE VARIABLES","VARIÁVEIS DO MODELO"],["＋ New variable","＋ Nova variável"],["Variables control the entire template. They do not belong to a specific element: you must use them in a property or expression. Lengths/numbers go in expressions (e.g. row); color variables go directly in Stroke/Fill (e.g. lineColor). The preview value changes the drawing here; the default is saved in the exported file.","As variáveis controlam o modelo inteiro. Elas não pertencem a um elemento específico: você precisa usá-las em uma propriedade ou expressão. Comprimentos/números vão em expressões (ex.: row); variáveis de cor vão diretamente em Traço/Preenchimento (ex.: lineColor). O valor de pré-visualização altera o desenho aqui; o padrão é salvo no arquivo exportado."],["NEW VARIABLE","NOVA VARIÁVEL"],["Variable name","Nome da variável"],["No spaces; use letters, numbers, and _.","Sem espaços; use letras, números e _."],["Display label","Rótulo de exibição"],["Line color","Cor da linha"],["Length (mm)","Comprimento (mm)"],["Color","Cor"],["Decimal number","Número decimal"],["Integer","Inteiro"],["Default value","Valor padrão"],["Template role","Função no modelo"],["Default","Padrão"],["Primary spacing","Espaçamento principal"],["Minimum","Mínimo"],["Maximum","Máximo"],["Optional","Opcional"],["Cancel","Cancelar"],["Create variable","Criar variável"],["TEMPLATE VARIABLES","VARIÁVEIS DO MODELO"],["FILE INFORMATION","INFORMAÇÕES DO ARQUIVO"],["Name, ID, description, and tags identify the template. They do not change the drawing geometry. The colors below affect only the editor preview.","Nome, ID, descrição e tags identificam o modelo. Eles não alteram a geometria do desenho. As cores abaixo afetam apenas a pré-visualização do editor."],["Description","Descrição"],["Author","Autor"],["License","Licença"],["Version","Versão"],["Tags","Tags"],["PREVIEW COLORS","CORES DA PRÉ-VISUALIZAÇÃO"],["These colors are editor preview settings; elements using “ink” or “accent” use the selected colors. They are not saved in the file.","Estas cores são configurações de pré-visualização do editor; elementos que usam “ink” ou “accent” usam as cores selecionadas. Elas não são salvas no arquivo."],["QUICK ACTIONS","AÇÕES RÁPIDAS"],["Search commands or tools…","Buscar comandos ou ferramentas…"],["Search commands","Buscar comandos"],["Available commands","Comandos disponíveis"],["↑↓ Navigate","↑↓ Navegar"],["Enter Run","Enter Executar"],["Ctrl K close","Ctrl K fechar"],["INSERT ELEMENT","INSERIR ELEMENTO"],["Group selection","Agrupar seleção"],["Move up","Mover para cima"],["Move down","Mover para baixo"],["Horizontal line","Linha horizontal"],["Vertical line","Linha vertical"],["Rectangle","Retângulo"],["Ellipse","Elipse"],["Circle","Círculo"],["Line","Linha"],["Text","Texto"],["Dot","Ponto"],["Polyline","Polilinha"],["Polygon","Polígono"],["SVG path","Caminho SVG"],["Hatch","Hachura"],["Group","Grupo"],["Repeat","Repetir"],
["Valid JSON","JSON válido"],["Invalid expression near ","Expressão inválida perto de "],["Choose ink, accent, or color variable","Escolher tinta, destaque ou variável de cor"],["Apply color…","Aplicar cor…"],["Ink","Tinta (ink)"],["Accent","Destaque (accent)"],["No fill (none)","Sem preenchimento (none)"],["No stroke (none)","Sem traço (none)"],[" · variable"," · parâmetro"],["Use color ","Use color "],["This template has no variables. Add one to expose configurable values without editing the element structure.","Este modelo não define variáveis. Adicione uma para expor valores configuráveis sem editar a estrutura dos elementos."],["Remove variable ","Remover a variável "],["Enter a hex color, for example #4f7cff.","Insira uma cor hexadecimal, por exemplo #4f7cff."],["Use a hex color, for example #4f7cff.","Use uma cor hexadecimal, por exemplo #4f7cff."],["Preview value (mm)","Valor de pré-visualização (mm)"],["Preview value","Valor de pré-visualização"],["Invalid hex","Hexadecimal inválido"],["To link it, select an element and choose this variable in the Stroke or Fill field.","Para vinculá-la, selecione um elemento e escolha esta variável no campo Traço ou Preenchimento."],["To link it, use the name ","Para vinculá-la, use o nome "],[" in an element measurement or expression, for example: "," em uma medida ou expressão de elemento, por exemplo: "],["Invalid JSON: ","JSON inválido: "],["JSON formatted.","JSON formatado."],["JSON editor reverted to the last valid version.","Editor JSON revertido para a última versão válida."],["Unsupported element type: ","Tipo de elemento não suportado: "],["Element added","Elemento adicionado"],["To delete multiple elements together, select items in the same group.","Para excluir vários elementos juntos, selecione itens do mesmo grupo."],["To duplicate multiple elements together, select items in the same group.","Para duplicar vários elementos juntos, selecione itens do mesmo grupo."],[" elements duplicated."," elementos duplicados."],["There are unexported changes. Create a new template?","Há alterações não exportadas. Criar um novo modelo?"],["Discard unexported changes and open this template?","Descartar alterações não exportadas e abrir este modelo?"],["There are unsaved changes. Open another file anyway?","Há alterações não salvas. Abrir outro arquivo mesmo assim?"],["File exceeds 1 MiB.","O arquivo excede 1 MiB."],["File opened: ","Arquivo aberto: "],["Template loaded.","Modelo carregado."],["Could not open: ","Não foi possível abrir: "],["Template exported.","Modelo exportado."],["Export complete","Exportação concluída"],["Line ","Linha "],["column ","coluna "],["Expression ","Expressão "],["Inside a repeat: X/Y refer to the first occurrence; geometry changes affect every copy.","Dentro de uma repetição: X/Y representam a primeira ocorrência; mudanças na geometria afetam todas as cópias."],["X/Y indicate the element's bounding box on the page. Nested elements keep their group context.","X/Y indicam a caixa do elemento na página. Elementos aninhados mantêm seu contexto de grupo."],
];
const enToPt = new Map(pairs.filter(([en, pt]) => en && pt));
const ptToEn = new Map(pairs.filter(([en, pt]) => en && pt).map(([en, pt]) => [pt, en]));
const prefixes = [
  ["File opened: ", "Arquivo aberto: "],
  ["Could not open: ", "Não foi possível abrir: "],
  ["Invalid JSON: ", "JSON inválido: "],
  ["Invalid expression near ", "Expressão inválida perto de "],
  ["Remove variable ", "Remover a variável "],
  ["Use color ", "Use color "],
  ["To link it, use the name ", "Para vinculá-la, use o nome "],
  ["Unsupported element type: ", "Tipo de elemento não suportado: "],
  ["Line ", "Linha "],
  ["Expression ", "Expressão "],
  ["column ", "coluna "],
  ["", ""]
];
let language = "en";
try {
  language = localStorage.getItem("xtemplate-language") === "pt-BR" ? "pt-BR" : "en";
} catch {}
const selector = document.getElementById("languageSelect");
const ignored = "script,style,textarea,code,pre";
let translating = false;

function translateString(value, target) {
  const forward = target === "pt-BR";
  const map = forward ? enToPt : ptToEn;
  if (map.has(value)) return map.get(value);
  // Translate only known message prefixes. Never replace arbitrary substrings:
  // doing so can repeatedly mutate DOM attributes and trigger observer loops.
  for (const [en, pt] of prefixes) {
    if (!en || !pt) continue;
    const from = forward ? en : pt;
    const to = forward ? pt : en;
    if (value.startsWith(from)) return to + value.slice(from.length);
  }
  return value;
}

function translateNode(node, target) {
  if (!node) return;
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue;
    if (!value || !value.trim()) return;
    const leading = value.match(/^\\s*/)?.[0] || "";
    const trailing = value.match(/\\s*$/)?.[0] || "";
    const core = value.slice(leading.length, value.length - trailing.length);
    const translated = translateString(core, target);
    if (translated !== core) node.nodeValue = leading + translated + trailing;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.matches(ignored)) return;
  for (const attr of ["title", "aria-label", "placeholder"]) {
    const value = node.getAttribute(attr);
    if (value) {
      const translated = translateString(value, target);
      if (translated !== value) node.setAttribute(attr, translated);
    }
  }
  if (node instanceof HTMLInputElement && ["button", "submit", "reset"].includes(node.type)) {
    const translated = translateString(node.value, target);
    if (translated !== node.value) node.value = translated;
  }
  for (const child of [...node.childNodes]) translateNode(child, target);
}

function applyLanguage(target) {
  language = target === "pt-BR" ? "pt-BR" : "en";
  translating = true;
  try {
    document.documentElement.lang = language;
    for (const child of [...document.body.childNodes]) translateNode(child, language);
    if (selector) selector.value = language;
    try { localStorage.setItem("xtemplate-language", language); } catch {}
  } finally {
    translating = false;
  }
}

selector?.addEventListener("change", () => applyLanguage(selector.value));
// Translate only newly inserted UI. Attribute mutations are intentionally not
// observed: our own translations must never retrigger translation recursively.
const observer = new MutationObserver(records => {
  if (translating) return;
  translating = true;
  try {
    for (const record of records) {
      if (record.type === "childList") {
        for (const node of record.addedNodes) translateNode(node, language);
      } else if (record.type === "characterData") {
        translateNode(record.target, language);
      }
    }
  } finally {
    translating = false;
  }
});
observer.observe(document.body, { subtree: true, childList: true, characterData: true });
applyLanguage(language);
