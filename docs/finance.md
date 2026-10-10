# Finance

Dashboard financeiro pessoal — receitas, despesas, orçamento, contas recorrentes, poupança e jornada de trabalho.

Interface principal em **inglês** (i18n); dados ficam na planilha **Joelboard Finance** no seu Google Drive.

## Abas

| Aba | Função |
|-----|--------|
| **Overview** | Resumo do mês: receita, despesa, saldo, taxa de poupança, total poupança, breakdown por categoria |
| **Work Log** | Calendário de dias trabalhados; estimativa de renda e lançamento no mês |
| **Money** | Transações (receita/despesa), busca e histórico |
| **Bills & Savings** | Contas recorrentes, metas, alocações, poupança geral, **rachar conta** (split) |
| **Budget** | Limites por categoria vs gasto real |

## Ações rápidas

- **+ (FAB)** — nova transação.
- **↻** no header — recarregar dados da planilha.
- **⚙ Ajustes** — temas (8 skins), idioma, salário, categorias, backup CSV, tutorial, feedback.

## Contas e pagamentos

- Contas **recorrentes** geram lembretes mensais.
- Marcar como paga registra valor real e data (aba Payments na planilha).
- **“Só deste mês”** altera uma ocorrência sem marcar paga automaticamente.

## Poupança

- **Total savings** = saldo base editável + contribuições marcadas como pagas.
- Metas e alocações mensais na aba Bills.

## Rachar conta (split)

Registre um gasto (só você ou compartilhado), divida itens entre pessoas e acompanhe quem deve. **Rascunhos novos não gravam na planilha até você salvar** (botão Salvar / Pronto). Fechar com conteúdo sem salvar pergunta se quer gravar. Depois do primeiro save, o rascunho **salva sozinho** de novo. Dá para reabrir o calculador no card. Opcionalmente gera uma conta 1× no Finance com a sua parte (`🍻 Quem me deve · …`): no mês atual pode marcar como gasto pago; em mês futuro fica em aberto. A lista segue o **mês selecionado** no Finance (só rolês daquele mês).

## Planilha (abas)

`Transactions`, `Budget`, `Goals`, `Recurring`, `Allocations`, `Bundles`, `Categories`, `Debts`, `WorkLog`, `Payments`, `Settings`.

Backup: **Ajustes → Export backup** (CSV).

## Preços (Contas)

Monitor de preços manual: **Buscar preços de hoje** consulta Google Shopping (`/api/precos`, SerpApi no servidor) e grava as ofertas do dia na aba **`PrecosCapturas`** (buscar de novo no mesmo dia substitui o dia). O gráfico, a mediana de 30 dias e o “desconto real” usam esse histórico; com menos de 3 dias, o veredito usa o “preço normal” / “preço baixo” que o Google mostra.

- **Filtros** (por busca): marque várias lojas em **★ Só estas** ou **Ocultar**; palavras que o título precisa ter (**todas** = AND, **qualquer uma** = OR, ex. “placa de vídeo” ou “gpu”); palavras proibidas; preço-alvo. A contagem “X de Y ofertas aparecem” atualiza ao vivo. Variações da mesma loja (ex.: `mercadolivre.com.br` e “Mercado Livre”, vendedores “AliExpress - …”) viram uma loja só (`storeKey` em `lib/precos-math.mjs`).
- **Exibição** (todas as buscas): preço cheio ou à vista, mostrar PIX junto, ocultar preços fora de reais.
- **Comprado** (no painel expandido do card): risca com o ✏️ compartilhado, tira da lista ativa e vai para **Comprados**; desmarque para voltar a acompanhar.
- **Arquivar** (no detalhe da busca) tira o produto da lista; **Arquivo (N)** em Contas lista arquivadas — **Restaurar** ou **Excluir** (apaga busca + histórico na planilha).
- Abas: `PrecosBuscas`, `PrecosCapturas`, `PrecosManual`, `PrecosConferidas`, `PrecosLojas` (criadas sozinhas).
- Deploy: **`SERPAPI_KEY`** nas env vars da Vercel; localmente no `.env` (o Vite faz proxy de `/api/precos`). Não precisa de GitHub Actions nem conta de serviço.

## Dicas

- Use o **month picker** no topo para navegar meses.
- **Month summary (recap)** na Overview resume o mês fechado.
- Tour: **Settings → Replay tour**.
