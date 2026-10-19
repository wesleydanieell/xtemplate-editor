# XTemplate Studio — v0.1.0-alpha.6

Sexta versão **alpha** do editor local/offline de arquivos `.xtemplate` para XNotes Android. Consolida os PRs **#13–#21** com foco na criação visual de formas, no ajuste fino e em uma experiência de edição mais previsível. Ainda é uma **prévia para testes**, não uma versão beta ou estável.

## Principais mudanças

- **Pen unificada (P):** criação nativa de `line`, `polyline`, `polygon` e SVG `path`. Segmentos horizontais/verticais com guias magnéticas, Shift para ângulos de 45° e Alt para desativar o encaixe temporariamente.
- **Edição de vértices e curvas:** editor visual de pontos, alças Bézier independentes, inserção/remoção segura de nós, fechamento sem duplicar o primeiro vértice e preservação de expressões sempre que possível.
- **Hatch e SVG Path:** controles contextuais de ângulo, espaçamento e deslocamento, presets nativos; inspeção e edição de caminhos SVG dentro dos comandos reconhecidos pelo XNotes.
- **Espelhamento:** inverter horizontal ou verticalmente linhas, polígonos, polilinhas e curvas compatíveis sem adicionar atributos de transformação não suportados pelo Android.
- **Edição fora da folha:** é possível posicionar pontos, retângulos e elipses fora dos limites da página para montar capas. A arte renderizada permanece recortada à folha; controles de seleção/transformação ficam visíveis e editáveis fora dela.
- **Documento vazio por padrão:** nenhum elemento ou variável é criado automaticamente. Exemplos continuam disponíveis separadamente.
- **Structure:** arrastar e reordenar vários elementos selecionados de uma só vez, inclusive entre grupos, mantendo ordem, posição visual quando aplicável e um único passo no histórico.
- **Element / Variables:** propriedades contextuais prioritárias; seletores de cor na criação e edição de variáveis (valor exportado ou apenas prévia); sugestões compactas.
- **Redimensionamento:** Shift preserva proporções em alças de canto, incluindo formas quadradas, com snapping sem deformação.

## Downloads

- **Windows x64:** instaladores NSIS (`.exe`) e MSI (`.msi`), gerados no GitHub Actions com Tauri e WebView2.
- **Linux x86_64:** AppImage gerado no GitHub Actions.
- **Web offline:** arquivo `.zip` portátil; extrair e iniciar `./start.sh` (Python 3 + navegador moderno; `http://127.0.0.1:8765`).

## Compatibilidade, segurança e limitações

- O Studio exporta atributos nativos conhecidos pelo XNotes; os recursos apenas visuais do editor (alças, guias, clipping da área de trabalho) não são adicionados ao `.xtemplate`.
- A prévia SVG **não garante paridade pixel a pixel** com o interpretador Android. Teste no XNotes a renderização final de templates complexos, principalmente curvas, clipping, Hatch, Repeat e expressões.
- A alteração de coordenadas com expressões pode exigir confirmação explícita antes de convertê-las em valores literais.
- O projeto permanece em alpha: exporte os arquivos para persistir seu trabalho; não há sincronização em nuvem.
- Instaladores Windows não são assinados digitalmente; o SmartScreen pode exibir um aviso de editor desconhecido.
- O formato `.xtemplate` do XNotes **não oferece gradientes nativos**; gradientes do leitor SVG externo não equivalem a fills de `.xtemplate`.

## Verificação

- Suíte unitária, smoke tests reais no Chromium, validação sintática, empacotamento e verificações automatizadas de Linux/Windows nos workflows do repositório.
- Revisão de alterações e histórico dos PRs #13–#21; nenhum PR pendente foi incluído sem merge.
- A validação visual completa de templates exportados no dispositivo Android permanece uma tarefa futura.

**Contribuições:** commits e PRs desta versão incluem trabalho assistido por IA, revisado com testes automatizados. Reporte problemas pelo GitHub Issues e vulnerabilidades pelo procedimento em `SECURITY.md`.
