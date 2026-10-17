# XTemplate Studio — primeira alpha

Primeira versão pública experimental do editor visual de arquivos `.xtemplate` para o XNotes Android.

## Funcionalidades

- Criação, importação, edição visual e exportação de `.xtemplate`.
- Preview SVG de páginas A4, A5 e Letter e biblioteca de exemplos.
- Edição de objetos, árvore de camadas, seleção múltipla, agrupamento, duplicação, alinhamento e distribuição.
- Movimentação, redimensionamento, atalhos, pan e zoom, guias inteligentes e histórico de desfazer/refazer.
- Propriedades, variáveis configuráveis e editor JSON avançado.
- Interface local e offline (depois de iniciar o servidor local), sem bibliotecas externas de runtime.

## Como executar

Baixe o arquivo **XTemplate-Studio-v0.1.0-alpha.1.zip**, extraia e execute `./start.sh` no Linux (é necessário Python 3). Acesse `http://127.0.0.1:8765/`. Para outros sistemas, use `python3 -m http.server 8765 --bind 127.0.0.1` dentro da pasta extraída.

## Avisos da alpha

A compatibilidade de importação/exportação é baseada no leitor XTemplate do XNotes, porém a pré-visualização no navegador **não replica exatamente** o renderizador Android. Verifique no XNotes especialmente layouts complexos, expressões avançadas, texto e hachuras.

O trabalho não é salvo automaticamente em nuvem ou arquivo local: exporte seu `.xtemplate` regularmente. Não há instalador nativo nesta versão.

Problemas e sugestões: use a seção **Issues** deste repositório.
