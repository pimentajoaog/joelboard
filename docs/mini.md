# Mini — extensões Chrome

Extensões leves da família Joelboard, distribuídas como zip pelo Hub (**Mini → Baixar**). Não estão na Chrome Web Store — instalação manual em modo desenvolvedor.

Arquivos gerados no build: `public/extensions/joelboard-replace.zip`, `joelboard-refresh.zip`, `joelboard-report.zip`.

---

## Instalar

1. Baixe o zip no Hub (card Replace, Refresh ou Report).
2. Descompacte — pasta `replace`, `refresh` ou `report` com `manifest.json`.
3. Chrome → `chrome://extensions` → **Modo do desenvolvedor** ON.
4. **Carregar sem compactação** → selecione a pasta.
5. Fixe o ícone na barra.

Após **atualizar** a extensão (novo zip ou reload em `chrome://extensions`), **recarregue as abas abertas** — scripts antigos perdem o contexto da extensão.

---

## Replace — expansão de texto

Substitui **gatilhos** por templates em campos editáveis (input, textarea, contenteditable).

### Uso

1. Digite o gatilho (ex.: `/test`, `//oi`).
2. Pressione **Espaço**, **Tab** ou **Enter** (configurável no popup) — ou ative **Expandir ao terminar de digitar o gatilho** para expandir assim que o último caractere do gatilho for digitado (sem precisar de Espaço/Tab/Enter).
3. O gatilho expande — funciona **dentro de outro texto** (ex.: `test/test` reconhece `/test` no final).

### Formatação no texto expandido

No editor de template (popup), use marcadores no **texto expandido** (não no gatilho):

- `**negrito**`, `*itálico*`, `__sublinhado__`, `~~riscado~~`
- Linhas que começam com `- ` viram lista com marcadores

Em campos rich text (`contenteditable`, ex. Google Docs), a formatação é inserida como HTML. Em `input`/`textarea`, os marcadores são removidos e só o texto permanece.

Barra de formatação no editor de template: **B** / **I** / **U** / riscado / lista.

### Variáveis

- `{{nome}}`, `{{empresa}}`, `{{date}}`, `{{time}}`, `{{clipboard}}` ou `%clip%` para colar.

### Import / export

- JSON ou CSV/TSV no popup.
- Planilha: colunas `Nome`, `Trigger`, `Text` (ou `Trigger`, `Text`).

### Sincronização na nuvem (Google Sheets)

Macros, variáveis e ajustes podem ficar na planilha **Joelboard Mini** no seu Drive — mesma conta Google do Hub — para usar em vários dispositivos.

**Opção A — popup da extensão:** Ajustes → **Nuvem** → Entrar com Google → Sincronizar. Alterações locais sobem automaticamente; a extensão puxa da planilha ao abrir o popup e a cada ~30 min.

**Opção B — Hub:** Mini → **Sincronizar Replace agora** (com a extensão instalada nesta aba). Cria ou usa a planilha com abas `Replace`, `ReplaceVars`, `ReplaceSettings`, `ReplaceSites`.

No segundo dispositivo: instale a extensão, entre com Google (ou use o Hub) e sincronize — os gatilhos aparecem.

### Permissões

Só roda em **sites permitidos** (padrão: Joelboard, Google Docs/Sheets, GitHub, …). Adicione domínios no Hub (**Mini → Sites permitidos**) ou no popup da extensão.

---

## Refresh — auto-reload da aba

Recarrega a aba atual em intervalo fixo.

### Uso

1. Abra a página desejada.
2. Popup da extensão → defina intervalo (mín. 3 s) → **Iniciar** (recarrega na hora).
3. Contador **↻** no canto da página enquanto ativo (some em aba inativa se “pausar inativo” estiver ON).

### Atalho

Padrão **Alt+Shift+R** — personalizável no popup (gravar novo atalho). Também disponível como comando Chrome.

### Comportamento

- Badge na extensão mostra tempo restante.
- Fechar a aba para o timer.
- Após reload/update da extensão, scripts antigos param silenciosamente (sem erro no console).

---

## Report — relatório recorrente

Monta um texto fixo com **contadores numéricos** — ideal para relatórios de Slack que repetem a mesma estrutura a cada hora.

### Uso

1. Abra o popup da extensão (**Relatório**).
2. Preencha os números (ex.: itens concluídos, em andamento, pendentes, meta, responsável).
3. Confira a **prévia** e clique **Copiar relatório**.
4. Cole no Slack.

Os valores ficam salvos para o próximo envio — só ajuste o que mudou.

### Template

Aba **Template** — edite labels, adicione/remova campos, linhas fixas (`Relatório:`, `Notas:`) e linhas em branco. Dois formatos de campo:

- **Número + rótulo** — ex.: `5 itens concluídos`
- **Prefixo + valor** — ex.: `Meta: 80%`

Use ▲/▼ para reordenar blocos.

### Permissões

Report roda **só no popup** — não injeta em páginas e não usa a lista de sites permitidos.

---

## Sites permitidos

Hub e extensões compartilham a lista via `chrome.storage` / mensagem `jb-mini-sites-set`. Com sync na nuvem ativo, a aba **ReplaceSites** da planilha Joelboard Mini guarda os domínios entre dispositivos. Domínios sem permissão não recebem content script até você adicionar e conceder acesso no Chrome.
