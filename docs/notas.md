# Notes

Listas flexíveis — compras, tarefas, notas livres e viagem — com itens marcáveis, grupos, prazos e fixação.

Dados na planilha **Joelboard Notes** no seu Drive.

## Tela inicial

- **Buscar listas** — filtra por título ou conteúdo dos itens (focus ring + botão limpar).
- Cards com tipo, progresso (feitos/total), prazo relativo.
- **Fixadas** aparecem no topo.
- **✦ Kits** — faixa de modelos no topo (não são listas vivas).
- **Compartilhadas** — seção à parte para listas com outras pessoas.
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

O tour na primeira abertura cobre kits vs listas vivas e o compartilhar.

## Kits

Modelos na faixa **✦ Kits** (os padrão são **Viagem nacional** e **Viagem internacional**). **Usar** copia o conteúdo para uma **lista nova**. Kits não entram no Planner nem na busca das listas do dia a dia.

Uma lista de verdade — inclusive compartilhada com alguém — pode ter o mesmo nome de um kit. Ela continua na home e no Planner; o nome sozinho não a transforma num segundo kit.

No ⋯ da lista: **Tornar preset** / **Tirar dos presets**. Preset compartilhado mora na pasta de kits do Drive; lista viva, na de compartilhadas.

## Listas compartilhadas

Ao tornar uma lista compartilhada, escolha como itens marcáveis funcionam:

- **Uma marcação para todos** (padrão) — um ✓ vale para toda a lista.
- **Cada um marca o seu** — o mesmo item fica aberto para os outros (útil em mala de viagem). Dá para mudar depois em Compartilhar.

Isso cria outra planilha no Drive (**Joelboard Lista — …**). A planilha pessoal só guarda o atalho na aba `Compartilhadas`. Envie o **link Joelboard** (`/notas/?join=…`); o outro entra com Google e precisa de acesso **Editor** no Drive.

Na planilha da lista: Meta coluna `Marcacao`; Itens coluna `FeitoPor` (JSON por e-mail) no modo pessoal.

## No Planner

**Liberar no Planner** (⋯) deixa a lista no catálogo de colar. Num plano compartilhado, a lista compartilhada anexada continua visível — o Planner lê as listas do Notes pessoal **e** as da aba `Compartilhadas`.

Uma planilha de **plano** (abas Meta + Dias) não é uma lista. O Notes ignora esse arquivo e devolve para a pasta do Planner se ele tiver ido parar nas pastas de notas.

## Planilha (abas)

Pessoal: `Notas`, `Itens`, `Config`, `Compartilhadas`.

Compartilhada: `Meta` (`Titulo`, `Tipo`, `Cor`, `Fixado`, `Criado`, `Atualizado`, `ID`, `Vence`, `OwnerEmail`, `Marcacao`), `Itens`, `Membros`.

## Offline / fila

Escritas usam `JB.persist` — falhas de rede podem ir para fila offline (badge no canto quando houver pendências).
