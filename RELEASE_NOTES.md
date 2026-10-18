# XTemplate Studio — v0.1.0-alpha.5

Quinta versão alpha, voltada à **compatibilidade com o XNotes e à estabilidade do editor visual**.

## Novidades

- **Edição múltipla:** atributos opcionais compatíveis podem ser modificados juntos, inclusive em elementos de mesmo tipo com propriedades ausentes.
- **Guias magnéticas:** alinhamento de objetos e de instâncias de `repeat`, com opção para desativar, e snapping nas bordas ativas ao redimensionar grupos.
- **Redimensionamento:** prévia de grupos recalcula o layout dos filhos, preservando o espaçamento fixo das linhas e colunas repetidas; bordas opostas permanecem ancoradas.
- **Inspetor Element:** atributos específicos organizados por importância, em seções Essential, Other Properties e Advanced Options.
- **Transformações:** núcleo interno com matrizes afins 2D para cálculos do editor; nenhum campo de matriz incompatível é exportado para o XNotes.
- **Rotação compatível:** rotação de texto em múltiplos de 90°, conforme o interpretador Android; controles de rotação geométrica não suportados foram removidos.
- **Qualidade:** testes de regressão para repetição, snapping, edição múltipla, transformação, compatibilidade e preservação de JSON.

## Arquivos de instalação

- **Windows x64:** instalador `.exe` ou `.msi` (Tauri 2 / Microsoft WebView2); ainda sem assinatura digital.
- **Linux x86_64:** AppImage.
- **Versão web portátil:** `.zip`, para uso offline com servidor HTTP local.

## Limitações conhecidas

A paridade completa da renderização com o XNotes Android ainda necessita validação no aplicativo, sobretudo expressões complexas, fontes e SVG Paths. A rotação geométrica arbitrária de formas/grupos não é suportada pelo formato Android atual. As novas guias magnéticas de redimensionamento abrangem grupos; outros tipos de elemento ainda exigem integração. O inspetor contextual ainda está em evolução. Exporte explicitamente o documento para persistir seu `.xtemplate`.
