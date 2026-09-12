# Notes

Listas flexíveis — compras, tarefas, notas livres e viagem — com itens marcáveis, grupos, prazos e fixação.

Dados na planilha **Joelboard Notes** no seu Drive.

## Tela inicial

- **Buscar listas** — filtra por título ou conteúdo dos itens (focus ring + botão limpar).
- Cards com tipo, progresso (feitos/total), prazo relativo.
- **Fixadas** aparecem no topo.
- **+ (FAB)** cria lista (título, tipo, prazo opcional).

## Tipos de lista

| Tipo | Ícone | Comportamento |
|------|-------|----------------|
| Compras | 🛒 | Itens marcáveis por padrão |
| Tarefas | ✅ | Itens marcáveis por padrão |
| Nota | 📝 | Texto livre; linha vira item marcável ao tocar ☑ |
| Viagem | 🧳 | Itens marcáveis por padrão |

## Dentro de uma lista

- Edite o título inline.
- **Prazo** — botão de data (calendário Joelboard, não nativo).
- Adicione itens (Enter ou botão); **cole várias linhas** de uma vez.
- **Grupos** — seções colapsáveis com contagem feito/total.
- **Selecionar** — modo bulk para apagar vários itens.
- **Preencher da última vez** — copia itens de outra lista do mesmo tipo.
- **Usuais** — sugestões ao digitar.
- Arraste ⠿ para reordenar itens e grupos.

## Markdown leve nos itens

`**negrito**`, `*itálico*`, `__sublinhado__`, `~~riscado~~`.

## Ajustes (⚙)

Tema, tutorial, feedback.

## Listas compartilhadas

Ao tornar uma lista compartilhada, escolha como itens marcáveis funcionam:

- **Uma marcação para todos** (padrão) — um ✓ vale para toda a lista.
- **Cada um marca o seu** — o mesmo item fica aberto para os outros (útil em mala de viagem). Dá para mudar depois em Compartilhar.

Na planilha da lista: Meta coluna `Marcacao`; Itens coluna `FeitoPor` (JSON por e-mail) no modo pessoal.

## Planilha (abas)

`Notas`, `Itens`, `Config`.

## Offline / fila

Escritas usam `JB.persist` — falhas de rede podem ir para fila offline (badge no canto quando houver pendências).
