# Guia de autoria de arquivos `.xtemplate` para XNotes

This guide describes the format read by XNotes, based on the Android reader `TemplateReader.kt`, no avaliador `TemplateEval.kt`/`TemplateExpr.kt` and the repository’s official templates. The file is JSON: use double quotes, correct commas, and no comments.

## 1. Como o arquivo funciona

An `.xtemplate` is a vector description of a page, not a finished image. XNotes reads the element tree, evaluates expressions in millimeters for the page size, and draws the shapes. This lets the same template adapt to different page sizes.

Minimal structure:

```json
{
  "xtemplate": 1,
  "id": "xtemplate.meus-modelos.pautado",
  "name": "Papel pautado",
  "description": "Linhas para escrita.",
  "license": "MIT",
  "tags": ["writing", "lines"],
  "params": {},
  "items": [
    { "type": "hline", "y": "20mm", "stroke": "ink" }
  ]
}
```

- `xtemplate`: versão numérica do formato; os modelos atuais usam `1`.
- `id`: identificador estável e único, de preferência com prefixo `xtemplate.`.
- `name`, `description`, `author`, `license`, `version`: metadados opcionais para identificar e explicar o modelo.
- `tags`: lista de palavras-chave.
- `params`: opções que quem usa o modelo pode personalizar.
- `items`: lista ordenada de elementos. A ordem importa quando há sobreposição: os elementos posteriores são desenhados depois.

O XNotes tem limites de leitura, incluindo 1 MiB, 32 níveis de árvore e 10.000 nós. O leitor é tolerante com campos desconhecidos, mas nós desconhecidos ou valores que não consegue interpretar podem ser ignorados. Não conte com propriedades inventadas para produzir efeitos no aplicativo.

## 2. Elementos e contêineres

Each item has a `type` and specific properties. Types recognized by the reader:

| Tipo | Uso / propriedades principais |
|---|---|
| `group` | Contêiner; aceita `x`, `y`, `w`, `h`, `inset`, `clip` e `children`. Estilos no grupo são herdados pelos filhos. |
| `repeat` | Repete `children`; usa `axis`, `period` ou `count`, `fit`, `index`, `stagger` e `extend`. |
| `line` | Segmento entre `x1`, `y1`, `x2`, `y2`. |
| `hline` | Linha horizontal; usa `y` e opcionalmente `x1`, `x2`. |
| `vline` | Linha vertical; usa `x` e opcionalmente `y1`, `y2`. |
| `rect` | Retângulo com `x`, `y`, `w`, `h` e raio opcional `rx`. |
| `circle` | Círculo com centro `cx`, `cy` e raio `r`. |
| `ellipse` | Elipse com centro `cx`, `cy` e raios `rx`, `ry`. |
| `dot` | Ponto circular com centro `cx`, `cy` e raio opcional `r`. |
| `polyline` / `polygon` | Lista `points` de pares `[x, y]`; polígono fecha a forma. |
| `path` | Caminho SVG com `d`, `viewBox` opcional e caixa `x`, `y`, `w`, `h`; `aspect: "stretch"` permite esticar a proporção. |
| `text` | Texto em `text`, posição `x`, `y` e estilo tipográfico. Aceita uma string ou lista de strings. |
| `hatch` | Hachura com `period`, `angle`, `offset` e `extend`. |

Exemplo de grupo e repetição:

```json
{
  "type": "group",
  "inset": ["10mm", "12mm"],
  "children": [
    {
      "type": "repeat",
      "axis": "y",
      "period": "8mm",
      "fit": "space",
      "children": [
        { "type": "hline", "y": "100%", "stroke": "accent", "strokeWidth": "0.2mm" }
      ]
    }
  ]
}
```

`inset` pode ser um valor único, um par ou uma lista de 3 ou 4 valores. Em `repeat`, `axis` pode ser `x`, `y`, `xy` ou `none`; `fit` aceita `repeat`, `space`, `round` ou `center`. Para repetir nos dois eixos, use `period`/`count`/`fit` como um par quando precisar de valores diferentes para X e Y.

## 3. Measurements and expressions

Comprimentos literais são convertidos para milímetros. Exemplos: `"12mm"`, `"1.2cm"`, `"0.5in"`, `"10pt"` ou o número `12` (milímetros). Para propriedades geométricas, uma string também pode ser uma expressão matemática.

- `W` e `H`: largura e altura da caixa atual, não necessariamente da página inteira.
- `i` e `j`: índices da repetição atual.
- `pi`: constante π.
- `%`: percentual relativo ao eixo da propriedade: largura para X, altura para Y, menor dimensão para medidas de estilo e valor unitário para expressões sem eixo.
- Operadores: `+`, `-`, `*`, `/` e parênteses.
- Funções: `abs`, `floor`, `ceil`, `round`, `sqrt`, `sin`, `cos`, `tan`, `log10`, `mod`, `pow`, `min` e `max`. Os ângulos de `sin`, `cos` e `tan` são em graus.

Exemplos úteis:

```json
{ "type": "vline", "x": "W * 0.3", "stroke": "accent" }
{ "type": "group", "y": "24mm", "h": "H - 24mm", "children": [] }
{ "type": "hline", "y": "i * spacing", "stroke": "ink" }
```

Uma expressão deve referenciar nomes definidos em `params` ou nomes reservados. Um nome inexistente, divisão por zero ou resultado não finito pode fazer o elemento ser ignorado pelo renderizador.

## 4. Parâmetros: a que ficam vinculados?

A variable is **not automatically linked to a specific element**. It is a named template variable. Reference it in the properties of the elements where it should take effect. The same variable can control multiple elements at once.

```json
"params": {
  "spacing": { "type": "length", "default": "8mm", "min": "4mm", "max": "14mm", "label": "Espaçamento entre linhas", "role": "spacing" },
  "lineColor": { "type": "color", "default": "#4f7cff", "label": "Cor das linhas" }
}
```

Depois, use os nomes nas propriedades:

```json
"items": [
  { "type": "repeat", "axis": "y", "period": "spacing", "children": [
    { "type": "hline", "y": "100%", "stroke": "lineColor", "strokeWidth": "0.2mm" }
  ]}
]
```

- `length`: medida numérica em milímetros; pode ser usada em `x`, `y`, `w`, `h`, `period`, espessuras e expressões.
- `number`: número decimal para cálculos.
- `integer`: número inteiro, arredondado pelo XNotes.
- `color`: cor hexadecimal ou outra cor SVG válida. Use o nome do parâmetro em `stroke` ou `fill`, sem `$`.
- `default`: valor inicial. `min`, `max` e `step` são limites/opções numéricos para tipos não coloridos.
- `label`: texto que aparece na interface de personalização.
- `role: "spacing"`: marca um parâmetro de comprimento como espaçamento principal do template no XNotes. É um papel especial do aplicativo, não um vínculo automático com os elementos. Faça os elementos usarem esse nome em `period` ou nas expressões para que mudar o valor tenha efeito. Use no máximo um parâmetro com esse papel.

Os valores de pré-visualização do editor são temporários: eles ajudam a experimentar o resultado, mas não substituem os valores `default` gravados no `.xtemplate`. A cor de pré-visualização `ink`/`accent` também é uma configuração do editor; os tokens no arquivo continuam sendo `"ink"` e `"accent"`.

## 5. Cores, preenchimento e estilos

`stroke` define o contorno; `fill` define o interior. Os dois podem receber:

- `"ink"`: tinta principal definida pelo XNotes.
- `"accent"`: cor de destaque definida pelo XNotes.
- `"none"`: sem traço ou sem preenchimento, conforme a propriedade.
- `"#rrggbb"` ou `"#rgb"`: cor literal.
- O nome de um parâmetro cujo tipo é `color`, por exemplo `"lineColor"`.

Exemplo de forma preenchida:

```json
{ "type": "rect", "x": "20mm", "y": "20mm", "w": "40mm", "h": "25mm", "fill": "#dbeafe", "stroke": "accent", "strokeWidth": "0.4mm", "opacity": 0.9 }
```

Os estilos são herdados de `group` e `repeat`; um filho pode sobrescrever `stroke`, `fill`, `strokeWidth`, `dash`, `opacity`, `font`, `size`, `weight`, `italic`, `align`, `baseline` e `rotate`. `opacity` vai de 0 a 1. `dash` pode ser `[traço, espaço]` ou `"none"`. Para texto, `font` aceita `sans`, `serif` ou `mono`; `weight` aceita `normal` ou `bold`; `align` aceita `start`, `middle` ou `end`.

## 6. Texto e caminhos SVG

Texto pode interpolar valores com chaves, por exemplo `"Linha {i + 1}"`. Duplique chaves (`{{` e `}}`) para mostrar chaves literais. A propriedade `select` seleciona um item de uma lista de textos. O tamanho da fonte é uma medida, normalmente `"4mm"`.

Para `path`, `d` usa os comandos de caminho SVG aceitos pelo XNotes e `viewBox` pode ser `[x, y, largura, altura]`. A ferramenta Caneta Bézier do editor cria um `path`, mas confira o resultado no aplicativo Android antes de distribuir modelos complexos.

## 7. Fluxo recomendado para desenvolver

1. Start by duplicating a similar example rather than building the entire tree from scratch.
2. Choose clear variable names (`spacing`, `margin`, `lineColor`) e defina `label`, `default` e limites úteis.
3. Make each element reference the variables it depends on; creating a variable alone does not change the drawing.
4. Use `group` para organizar e herdar estilos e `repeat` para padrões regulares, em vez de duplicar dezenas de linhas manualmente.
5. Teste diferentes valores, tamanhos de página e limites no editor. Verifique que `min` não ultrapassa `max` e que expressões não dividem por zero.
6. Export the `.xtemplate`, open it in XNotes Android, and check the actual result. A pré-visualização web é aproximada: fontes, alguns detalhes de geometria e opções avançadas podem diferir.
7. Mantenha `id` estável, atualize `version` quando fizer uma nova versão do modelo e valide o JSON antes de compartilhar.

## 8. Desenvolver o próprio editor

O editor é local e offline. `app.js` coordena interface, edição e pré-visualização; `src/core/template-schema.js` define valores iniciais dos nós; `src/core/validate-template.js` aplica limites estruturais; `src/features/` contém recursos isolados. Antes de integrar mudanças, execute:

```bash
npm run check
npm test
```

A validação estrutural do editor não é o interpretador oficial. Para confirmar compatibilidade, consulte no repositório XNotes `app/src/main/java/com/xnotes/format/TemplateReader.kt`, `app/src/main/java/com/xnotes/core/template/TemplateEval.kt` e `TemplateExpr.kt`, além dos exemplos em `app/src/main/assets/templates/examples/`. O leitor Android pode ignorar um nó inválido mesmo que o JSON seja sintaticamente válido; por isso a revisão final no XNotes é parte do processo.
