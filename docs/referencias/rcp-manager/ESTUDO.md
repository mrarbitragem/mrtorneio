# RCP Manager — estudo para o MRTorneio

Origem: `RCP (2).html` (protótipo do Marciel, arquivo único de 10 mil linhas). Estudado em 20/10/2026.

Este estudo vem de **leitura do código**. Não executei o RCP nem importei um PDF real. Onde digo "confere", foi conta feita à mão sobre o código.

Os trechos reaproveitáveis estão em `trechos/`, com as linhas de origem no cabeçalho. Os logos em base64 (quase metade do arquivo) ficaram de fora. **Nada daqui entra no build.** É referência para portar quando for a hora.

## 1. O que é o RCP

- Um HTML só, sem biblioteca externa, com estado em `localStorage` (um objeto `state` com `meta` e `categories`).
- Cada categoria tem participantes, grupos com jogos, `groupStageConfirmed` e a `elimination` (a chave).
- Tem tema claro/escuro, "Mesa de operação" (jogos por horário), agenda por grupo ou fase e aviso de atleta repetido (`getCategoryAthleteConflicts`; não verifiquei se cruza categorias).
- Fala o vocabulário que você usa: **campanha**, **cabeça de chave**, **melhor campanha (MC)**, **sorteio por campanhas**.

## 2. Impressão (o que vale levar)

### 2.1 Como funciona

`printWindowDocument(título, html, opções)` (`trechos/01`):

1. Abre uma janela nova (`window.open('about:blank')`).
2. Se o navegador bloquear o pop-up, cai para um `iframe` invisível e chama `print()` sozinho, removendo o iframe depois.
3. Escreve um documento completo com `@page { size: A4 retrato|paisagem; margin: … }`.
4. Mostra na tela uma barra com **Imprimir** e **Fechar**, escondida no `@media print`.
5. Cada "folha" é uma `<section class="sheet">`. Duas folhas seguidas quebram página (`page-break-before`).

Margem e orientação mudam por relatório: `bracketWide` usa 5 mm, `compactGames` usa 5 mm 5 mm 6 mm, o resto usa 10 mm.

### 2.2 Os cinco relatórios

| Relatório | Função | Trecho | Formato |
|---|---|---|---|
| Grupos completos | `buildGroupsPrintHtml` | `02` | Uma folha por grupo: classificação e jogos do grupo |
| Apenas grupos | `buildGroupsCompactPrintHtml` | `02` | Vários grupos por folha, com paginação por "custo" (capacidade 6,1; máx. 5 grupos) |
| Vários grupos de várias categorias | `printMultipleCategoriesGroupsOnly` | `04` | Diálogo com checkboxes que reaproveita o "apenas grupos" |
| Classificados e cabeças | `buildQualifiedPrintHtml` | `02` | Tabela de seed, origem, vitórias, saldos e médias |
| **Chave eliminatória** | `buildBracketPrintHtml` | `03` | **SVG** em A4 retrato, uma folha |
| **Lista de jogos** | `buildGamesListPrintHtml` | `04` | Tabela do dia, A4 retrato, 8–9 pt |

### 2.3 Ideias boas para o MRTorneio

- **Chave em SVG, não em HTML.** É o item mais valioso. O cálculo de coordenadas é separado do desenho: colunas, `matchStep`, `pairSep`, os `nodes` com `top`/`bottom`/`center`, e as linhas ortogonais sem aresta duplicada. O `viewBox` escala para o A4 sem mudar fonte, e `textLength` + `clipPath` impedem nome comprido de invadir a coluna. O código ajusta o espaçamento a partir de 16 jogos na 1ª rodada (não testei com mais que isso). Hoje o MRTorneio só mostra a chave em colunas na tela.
- **Origem abreviada na chave impressa:** `2º DA 3ª MC` e `3ª MC`, e `Grupo 2` vira `G2`. Se virmos o ranking cruzado, a chave ainda sem times fica legível.
- **Lista de jogos com células mescladas** (`rowspan`) por hora, categoria e fase. O limite `maxHourBlock = 18` impede que o bloco gigante estoure a página, e `thead` repete em cada folha.
- **Siglas de categoria:** `DFC` (dupla feminina C), `DMD`, `DXI` (mista iniciante), com legenda no topo.
- **Nomes curtos só no impresso:** primeiro + último nome de cada atleta, e capitalização de CAIXA ALTA para Título, sem alterar o cadastro.
- **Modo "para árbitros":** a mesma lista com a coluna de resultado em branco, ou com placares.
- **Logo do torneio no cabeçalho do impresso**, com o logo do sistema menor à direita.
- **Impressão sem poluir:** o estado do app não muda, e os relatórios só leem.

### 2.4 Cuidados ao portar

- O RCP monta HTML por string. No React o escape é automático, então o `escapeHtml` some.
- Em vez de `document.write` em janela nova, o caminho mais limpo no MRTorneio é uma **rota de impressão** (por exemplo `/t/:id/c/:id/imprimir/:tipo`). A rota usa variantes `print:` do Tailwind e injeta um `<style>` com `@page`. Isso evita pop-up bloqueado, que é a razão do fallback por iframe no RCP.
- O trecho `01` leva, por engano, CSS do app (`.operation-filters…`, linhas 7787–7801) dentro do CSS de impressão. Não copiar essa parte.
- Os cálculos devem virar **funções puras com teste**: layout da chave, agrupamento da lista (`rowspan`), siglas e nomes curtos. Hoje estão misturados à string de HTML.
- O modelo de dados é diferente. O RCP tem `groups[].matches[]` e `elimination.rounds[].matches[]`. O MRTorneio tem `matches` com `phase`, `round`, `position` e `feedsToMatchId`. A lista de jogos do RCP **não imprime quadra**. No MRTorneio já existe `court`, então vale decidir se entra.
- Placar impresso: seguir a decisão de `7x6` / `9x8`, sem dígito de tie-break.

## 3. Upload de arquivos

Quatro entradas. A terceira e a quarta são simples.

### 3.1 Importar PDF do LetzPlay (`trechos/05`)

É a parte mais sofisticada. Lê o PDF **sem biblioteca e sem servidor**:

1. Valida tamanho (20 MB) e a assinatura `%PDF-`.
2. Converte os bytes para texto, acha os objetos `N 0 obj … endobj` e os streams pelo `/Length`.
3. Descomprime `FlateDecode` com `DecompressionStream('deflate')`.
4. Monta o mapa de fontes pelo `ToUnicode` (`bfchar`/`bfrange`) para traduzir glifos em texto.
5. Em cada página, lê os blocos `BT…ET` e guarda cada trecho com `x`, `y` e `texto`.
6. `parseLetzplayCategory` agrupa por posição: acha `GRUPO NN`, a tabela de inscritos, a coluna JOGOS e as colunas JOGADORES 01 / PLACAR / JOGADORES 02.
7. Casa cada jogo com as duplas do grupo por **similaridade de nome** (`resolvePdfDuo`, com limiar 0,53 e margem 0,11 entre o 1º e o 2º candidato).
8. Mostra uma **pré-visualização** (grupos, duplas, jogos, avisos). A importação fica **bloqueada** se algum grupo não tiver todos os jogos.
9. Só ao confirmar cria a categoria. Recusa nome repetido, para não sobrescrever.

O que traz: nomes, grupos, confrontos, data/hora e quadra. O próprio RCP avisa que **placares, W.O. e a chave do PDF não são importados**. Ainda avisa conflito de agenda (mesma hora e quadra).

Um upload bem feito por esse desenho, e que o MRTorneio deve copiar: *ler, mostrar o que entendeu, avisar o que não entendeu e só então gravar.*

**Fragilidades (importante antes de portar):**

- **Posições fixas do layout do LetzPlay:** `y > 320`, `x` padrão 226/466/658, `y < 58` para o título, `/Circuito|Letzplay/`. Se o LetzPlay mudar o PDF, quebra em silêncio ou avisa "dupla não reconhecida".
- Só lê streams `Tj` com texto em hexadecimal (`<…> Tj`). Não trata o operador `TJ` (array) nem fontes que não usam `ToUnicode`.
- Procura objetos por expressão regular sobre o texto bruto. Não lê **object streams / xref streams** (PDF 1.5+ compactado), que alguns geradores usam. Funciona com PDFs do Chrome/Skia, como o comentário no código indica.
- Não trata PDF protegido por senha. Recusa PDF escaneado, com mensagem clara.
- Roda na thread principal. Com 20 MB trava a interface.

**Opções para o MRTorneio** (a decidir quando chegar a hora):

- **Manter o parser próprio**, portado para TS e rodando em Web Worker, com testes contra PDFs de exemplo. Zero dependência, mas mantém a fragilidade.
- **Usar `pdfjs-dist`.** Robusto contra xref/object streams e `TJ`, e dá o mesmo `x/y/texto`. Custa bundle (carregar sob demanda) e exige configurar o worker.
- Em qualquer caso, a **camada de pós-processamento** (agrupar por posição, casar nomes, validar, prévia) é a parte do RCP que vale aproveitar.

> Cuidado de privacidade: PDFs reais têm nomes de atletas. Para teste, usar PDF fictício do perfil MR Treinamento. Não commitar PDF real nem copiar nome para o KB.

### 3.2 JSON (`trechos/06`)

- Exportar: `Blob` + link temporário, com o nome do arquivo vindo do torneio.
- Importar: `FileReader` + `JSON.parse` + `migrateLegacyState` + `hydrateState`.
- **Falta validação de esquema.** Só confere `Array.isArray(categories)`. No MRTorneio, validar com um esquema (zod) antes de entrar no store. No modo Supabase, isso passa a ser porta de entrada de dados.

### 3.3 Logo do torneio (`trechos/06`)

- `<input type=file accept="image/png,webp,svg,jpeg">` + `FileReader.readAsDataURL`, guardado em `state.meta.tournamentPrintLogo` e usado no cabeçalho do impresso. Botão "Remover".
- **Sem limite de tamanho** e sem redimensionar. No MRTorneio: limitar (por exemplo 500 KB), redimensionar num `canvas` e, se for ao Supabase, usar Storage em vez de dentro do JSON do estado.

### 3.4 Colar lista de duplas

Existe um campo de texto grande (`#participantsInput`) com `parseParticipants`. **Não estudei esse trecho.** A zona de arrastar e soltar é só a do PDF (`pdf-import-dropzone`, com `dragenter/dragover/drop`, foco por teclado e `role="button"`).

## 4. Descoberta importante: a regra de campanha do RCP

Não era o pedido, mas é o que você disse que vai me passar. O RCP já tem uma regra completa e ela explica a diferença entre os seus dois protótipos.

**Estrutura e classificação** (texto da tela "Regras aplicadas" e `getGroupStructure` / `qualificationRule`):

- 3 a 5 duplas: todos contra todos (round robin).
- 6 ou mais: grupos de 3. Sobra de 1 ou 2 duplas vira grupos de 4, **sempre nos últimos grupos**.
- 6 a 47 duplas: **2 por grupo** passam. 48 a 128: só o **1º** de cada grupo.
- Até 128 duplas.

**Ordem das cabeças de chave** (`compareCampaign` / `deriveQualified`):

- Grupos do mesmo tamanho: vitórias, saldo de sets, saldo de games, **ranking do atleta** e sorteio.
- Grupos de tamanhos diferentes: sets average, games average, ranking e sorteio.
- BYE vai primeiro para as cabeças mais altas e, se faltar, para as melhores campanhas seguintes.

**Sorteio por faixas** (`drawSeedOrder`, `trechos/07`):

- Cabeça 1 fica na linha 1 e a 2 na última linha, fixas.
- As cabeças 3 e 4 caem em metades diferentes da chave, uma com a 1 e outra com a 2. Quem fica com cada uma sai por **cara ou coroa**.
- As demais faixas (5–8, 9–16…) são **embaralhadas dentro da própria faixa**.
- O resultado fica gravado. Abrir a página não refaz o sorteio, e "Refazer sorteio" é uma ação à parte.
- Há validação do sorteio (`isValidSeedDrawOrder`, `validateSeedPlacement`) e uma auditoria em texto.

**Relação com o Árbitro BT** (conferido à mão para 4 grupos):

- RCP, 4 grupos, sem troca de 3/4: `1º1×2º3`, `1º4×2º2`, `1º3×2º1`, `2º4×1º2`.
- RCP, 4 grupos, com troca de 3/4: `1º1×2º4`, `1º3×2º2`, `1º4×2º1`, `2º3×1º2`.
- O gabarito do Árbitro BT (e, portanto, o `CROSS_RANKING_TEMPLATES` que já está no MRTorneio) é **exatamente a segunda combinação**.

Ou seja: o Árbitro BT fixou uma das duas possibilidades que o RCP sorteia. No MRTorneio, a regra "ranking cruzado" copiada do Árbitro BT é determinística e **não sorteia faixas**. Para 5 a 8 grupos, o RCP embaralha também as faixas 5–8 e 9–16, e o Árbitro BT fixa uma ordem. Confira os dados de 5+ grupos antes de dar como equivalentes.

**Perguntas para quando você passar a regra** (não implementei nada):

1. A regra definitiva sorteia as faixas, como o RCP, ou usa a ordem fixa do Árbitro BT?
2. O **ranking do atleta** entra como desempate dos 1ºs? O MRTorneio não tem campo de ranking.
3. A regra de 48 a 128 duplas (só o 1º passa) deve entrar? Hoje o motor aceita só 2 classificados por grupo no ranking cruzado.
4. O sorteio das faixas fica gravado e só é refeito por ação explícita, como no RCP?

## 5. Sugestão de ordem quando for o momento

1. **Funções puras de impressão** com teste: layout da chave em SVG, agrupamento da lista de jogos, siglas de categoria, nomes curtos.
2. **Rota de impressão** com a chave em SVG e a lista de jogos. É o que mais pesa na operação do dia do torneio.
3. **Impressão de grupos** e dos classificados.
4. **Importação de PDF** com prévia e bloqueio, primeiro com a decisão entre parser próprio e `pdfjs-dist`.
5. **Validação do JSON** e logo com limite de tamanho.

## 6. O que fica de fora

- Importação de placares e da chave do PDF (o próprio RCP não faz).
- O tema e a "Mesa de operação" do RCP. Não foram estudados a fundo e o MRTorneio tem as próprias telas.
